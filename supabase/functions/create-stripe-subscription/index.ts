import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { sepaSetupEmail } from "../_shared/emailTemplates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) => {
  console.log(`[CREATE-STRIPE-SUB] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const priceId = Deno.env.get("STRIPE_PRICE_ID");
  const resendKey = Deno.env.get("RESEND_API_KEY");

  if (!stripeKey) return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not set" }), { status: 500, headers: corsHeaders });
  if (!priceId) return new Response(JSON.stringify({ error: "STRIPE_PRICE_ID not set" }), { status: 500, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { instanceId } = await req.json();
    if (!instanceId) throw new Error("instanceId is required");

    log("Creating subscription for instance", { instanceId });

    // Get instance
    const { data: instance, error: instErr } = await supabase
      .from("instances")
      .select("*")
      .eq("id", instanceId)
      .single();

    if (instErr || !instance) throw new Error("Instance not found");
    log("Instance found", { name: instance.business_name, email: instance.owner_email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const existingCustomers = await stripe.customers.list({ email: instance.owner_email, limit: 1 });
    let customer: Stripe.Customer;

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
      log("Existing Stripe customer found", { customerId: customer.id });
    } else {
      customer = await stripe.customers.create({
        email: instance.owner_email,
        name: instance.owner_name,
        metadata: { instance_id: instanceId, business_name: instance.business_name },
      });
      log("Stripe customer created", { customerId: customer.id });
    }

    // Create subscription with SEPA as default payment method type
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      payment_settings: {
        payment_method_types: ["sepa_debit"],
        save_default_payment_method: "on_subscription",
      },
      expand: ["latest_invoice.confirmation_secret", "pending_setup_intent"],
      metadata: { instance_id: instanceId },
    });

    log("Stripe subscription created", { subscriptionId: subscription.id });

    // Get setup link for SEPA mandate
    let setupUrl = "";
    if (subscription.pending_setup_intent) {
      const setupIntent = typeof subscription.pending_setup_intent === "string"
        ? await stripe.setupIntents.retrieve(subscription.pending_setup_intent)
        : subscription.pending_setup_intent;

      // Create a checkout session for setup
      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "setup",
        customer: customer.id,
        payment_method_types: ["sepa_debit"],
        success_url: `${req.headers.get("origin") || "https://example.com"}/instances/${instanceId}?setup=success`,
        cancel_url: `${req.headers.get("origin") || "https://example.com"}/instances/${instanceId}?setup=cancelled`,
        metadata: { instance_id: instanceId, subscription_id: subscription.id },
      });
      setupUrl = checkoutSession.url || "";
    } else {
      // Fallback: create a customer portal session
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customer.id,
        return_url: `${req.headers.get("origin") || "https://example.com"}/instances/${instanceId}`,
      });
      setupUrl = portalSession.url;
    }

    // Get price amount
    const price = await stripe.prices.retrieve(priceId);
    const monthlyAmount = (price.unit_amount || 0) / 100;

    // Upsert subscription in DB
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("instance_id", instanceId)
      .maybeSingle();

    if (existingSub) {
      await supabase.from("subscriptions").update({
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscription.id,
        status: "active",
        monthly_amount: monthlyAmount,
        plan: "standard",
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      }).eq("id", existingSub.id);
    } else {
      await supabase.from("subscriptions").insert({
        instance_id: instanceId,
        stripe_customer_id: customer.id,
        stripe_subscription_id: subscription.id,
        status: "active",
        monthly_amount: monthlyAmount,
        plan: "standard",
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      });
    }

    // Log activity
    await supabase.from("activity_log").insert({
      instance_id: instanceId,
      action: "Subscrição Stripe criada",
      details: `Customer: ${customer.id}, Subscription: ${subscription.id}, Valor: €${monthlyAmount.toFixed(2)}/mês`,
      performed_by: "admin",
    });

    // Send SEPA setup email via Resend
    if (resendKey && setupUrl) {
      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "onboarding@resend.dev",
            to: [instance.owner_email],
            subject: "Configura o teu método de pagamento",
            html: `
              <div style="font-family: 'DM Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h1 style="color: #6e1f2b; font-family: 'Cormorant Garamond', serif;">Olá ${instance.owner_name},</h1>
                <p style="color: #2a2a2a; line-height: 1.6;">
                  A tua subscrição para <strong>${instance.business_name}</strong> foi criada com sucesso.
                </p>
                <p style="color: #2a2a2a; line-height: 1.6;">
                  Para activar o débito directo SEPA, precisamos que configures o teu método de pagamento. 
                  Clica no botão abaixo para introduzir o teu IBAN e autorizar o débito directo.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${setupUrl}" style="background-color: #6e1f2b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
                    Configurar Método de Pagamento
                  </a>
                </div>
                <p style="color: #8b5e3c; font-size: 14px; line-height: 1.6;">
                  Este link é seguro e leva-te directamente à página de configuração do débito directo SEPA via Stripe.
                </p>
                <hr style="border: none; border-top: 1px solid #d8a3a0; margin: 30px 0;" />
                <p style="color: #999; font-size: 12px;">
                  Se tiveres alguma dúvida, responde directamente a este email.
                </p>
              </div>
            `,
          }),
        });

        if (emailRes.ok) {
          await supabase.from("activity_log").insert({
            instance_id: instanceId,
            action: "Email de setup SEPA enviado",
            details: `Enviado para ${instance.owner_email}`,
            performed_by: "system",
          });
          log("SEPA setup email sent", { to: instance.owner_email });
        } else {
          log("Failed to send email", { status: emailRes.status });
        }
      } catch (emailErr) {
        log("Email sending error", { error: String(emailErr) });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      setupUrl,
      subscriptionId: subscription.id,
      customerId: customer.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
