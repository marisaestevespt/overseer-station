import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { paymentFailedEmail } from "../_shared/emailTemplates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) => {
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response(JSON.stringify({ error: "Missing Stripe config" }), { status: 500, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret);
  } catch (err) {
    log("Signature verification failed", { error: String(err) });
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 400, headers: corsHeaders });
  }

  log("Event received", { type: event.type, id: event.id });

  try {
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const priceItem = sub.items.data[0];
        const monthlyAmount = (priceItem?.price?.unit_amount || 0) / 100;
        const status = sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : sub.status === "trialing" ? "trialing" : "cancelled";

        // Find instance by stripe_customer_id
        const { data: existingSub } = await supabase
          .from("subscriptions")
          .select("id, instance_id")
          .eq("stripe_subscription_id", sub.id)
          .maybeSingle();

        if (existingSub) {
          await supabase.from("subscriptions").update({
            status,
            monthly_amount: monthlyAmount,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            stripe_customer_id: customerId,
          }).eq("id", existingSub.id);

          await supabase.from("activity_log").insert({
            instance_id: existingSub.instance_id,
            action: `Subscrição ${event.type === "customer.subscription.created" ? "criada" : "actualizada"} via Stripe`,
            details: `Status: ${status}, Valor: €${monthlyAmount.toFixed(2)}`,
            performed_by: "stripe-webhook",
          });
        } else {
          // Try to find by customer email
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          const { data: subByCustomer } = await supabase
            .from("subscriptions")
            .select("id, instance_id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();

          if (subByCustomer) {
            await supabase.from("subscriptions").update({
              status,
              monthly_amount: monthlyAmount,
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
              stripe_subscription_id: sub.id,
            }).eq("id", subByCustomer.id);

            await supabase.from("activity_log").insert({
              instance_id: subByCustomer.instance_id,
              action: `Subscrição actualizada via Stripe`,
              details: `Status: ${status}`,
              performed_by: "stripe-webhook",
            });
          }
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
        if (!subId) break;

        const { data: subRecord } = await supabase
          .from("subscriptions")
          .select("id, instance_id")
          .eq("stripe_subscription_id", subId)
          .maybeSingle();

        if (subRecord) {
          const stripeSub = await stripe.subscriptions.retrieve(subId);
          await supabase.from("subscriptions").update({
            status: "active",
            current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
          }).eq("id", subRecord.id);

          // Check if instance was suspended → reactivate automatically
          const { data: instBefore } = await supabase
            .from("instances")
            .select("status, owner_name, owner_email, business_name")
            .eq("id", subRecord.instance_id)
            .single();

          const wasSuspended = instBefore?.status === "suspended";

          if (wasSuspended) {
            await supabase.from("instances").update({ status: "active" }).eq("id", subRecord.instance_id);

            await supabase.from("activity_log").insert({
              instance_id: subRecord.instance_id,
              action: "Instância reactivada automaticamente",
              details: "Pagamento regularizado — acesso restaurado",
              performed_by: "stripe-webhook",
            });

            // Send reactivation email
            const resendKey = Deno.env.get("RESEND_API_KEY");
            if (resendKey && instBefore) {
              try {
                await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                  },
                  body: JSON.stringify({
                    template: "reactivation",
                    instanceId: subRecord.instance_id,
                  }),
                });
              } catch (emailErr) {
                log("Failed to send reactivation email", { error: String(emailErr) });
              }
            }
          }

          await supabase.from("activity_log").insert({
            instance_id: subRecord.instance_id,
            action: "Pagamento recebido com sucesso",
            details: `Valor: €${((invoice.amount_paid || 0) / 100).toFixed(2)}`,
            performed_by: "stripe-webhook",
          });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;
        if (!subId) break;

        const { data: subRecord } = await supabase
          .from("subscriptions")
          .select("id, instance_id")
          .eq("stripe_subscription_id", subId)
          .maybeSingle();

        if (subRecord) {
          await supabase.from("subscriptions").update({ status: "past_due" }).eq("id", subRecord.id);

          await supabase.from("activity_log").insert({
            instance_id: subRecord.instance_id,
            action: "Pagamento falhado",
            details: `Motivo: ${invoice.attempt_count} tentativa(s)`,
            performed_by: "stripe-webhook",
          });

          // Send payment failed email
          const resendKey = Deno.env.get("RESEND_API_KEY");
          if (resendKey) {
            try {
              const { data: inst } = await supabase.from("instances").select("owner_name, owner_email").eq("id", subRecord.instance_id).single();
              if (inst) {
                const now = new Date();
                const monthYear = `${now.toLocaleString("pt-PT", { month: "long" })} ${now.getFullYear()}`;
                const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
                let updateUrl = "#";
                if (customerId) {
                  try {
                    const portalSession = await stripe.billingPortal.sessions.create({
                      customer: customerId,
                      return_url: "https://example.com",
                    });
                    updateUrl = portalSession.url;
                  } catch (_) { /* ignore */ }
                }

                await fetch("https://api.resend.com/emails", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
                  body: JSON.stringify({
                    from: "onboarding@resend.dev",
                    to: [inst.owner_email],
                    subject: "Problema com o teu pagamento",
                    html: paymentFailedEmail(inst.owner_name, monthYear, updateUrl),
                  }),
                });

                await supabase.from("activity_log").insert({
                  instance_id: subRecord.instance_id,
                  action: "Email de pagamento falhado enviado",
                  details: `Enviado para ${inst.owner_email}`,
                  performed_by: "stripe-webhook",
                });
              }
            } catch (emailErr) {
              log("Failed to send payment failed email", { error: String(emailErr) });
            }
          }
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const { data: subRecord } = await supabase
          .from("subscriptions")
          .select("id, instance_id")
          .eq("stripe_subscription_id", sub.id)
          .maybeSingle();

        if (subRecord) {
          await supabase.from("subscriptions").update({ status: "cancelled" }).eq("id", subRecord.id);
          await supabase.from("instances").update({ status: "suspended" }).eq("id", subRecord.instance_id);

          await supabase.from("activity_log").insert({
            instance_id: subRecord.instance_id,
            action: "Subscrição cancelada no Stripe",
            details: "Instância suspensa automaticamente",
            performed_by: "stripe-webhook",
          });
        }
        break;
      }

      case "customer.subscription.trial_will_end": {
        const sub = event.data.object as Stripe.Subscription;
        const { data: subRecord } = await supabase
          .from("subscriptions")
          .select("id, instance_id")
          .eq("stripe_subscription_id", sub.id)
          .maybeSingle();

        if (subRecord) {
          await supabase.from("activity_log").insert({
            instance_id: subRecord.instance_id,
            action: "Trial a terminar em breve",
            details: `Fim do trial: ${new Date(sub.trial_end! * 1000).toISOString()}`,
            performed_by: "stripe-webhook",
          });
        }
        break;
      }
    }
  } catch (err) {
    log("Error processing event", { error: String(err) });
    return new Response(JSON.stringify({ error: "Processing error" }), { status: 500, headers: corsHeaders });
  }

  return new Response(JSON.stringify({ received: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
