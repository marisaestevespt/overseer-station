import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { welcomeEmail, sepaSetupEmail, paymentFailedEmail, renewalReminderEmail } from "../_shared/emailTemplates.ts";
import type { EmailBranding } from "../_shared/emailTemplates.ts";
import { DEFAULT_BRANDING } from "../_shared/emailTemplates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) => {
  console.log(`[SEND-EMAIL] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), { status: 500, headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { template, instanceId, extraData } = await req.json();
    if (!template || !instanceId) throw new Error("template and instanceId are required");

    log("Sending email", { template, instanceId });

    // Fetch instance
    const { data: instance, error: instErr } = await supabase
      .from("instances")
      .select("*")
      .eq("id", instanceId)
      .single();
    if (instErr || !instance) throw new Error("Instance not found");

    // Fetch branding from email_settings dynamically
    let branding: EmailBranding = DEFAULT_BRANDING;
    const { data: settings } = await supabase
      .from("email_settings")
      .select("*")
      .limit(1)
      .single();
    if (settings) {
      branding = {
        business_name: settings.business_name || DEFAULT_BRANDING.business_name,
        contact_email: settings.contact_email || DEFAULT_BRANDING.contact_email,
        phone: settings.phone || "",
        address: settings.address || "",
        business_hours: settings.business_hours || "",
        website: settings.website || "",
        logo_url: settings.logo_url || "",
        instagram_url: settings.instagram_url || "",
        linkedin_url: settings.linkedin_url || "",
        facebook_url: settings.facebook_url || "",
        twitter_url: settings.twitter_url || "",
      };
    }

    let html: string;
    let subject: string;

    switch (template) {
      case "welcome": {
        const url = instance.instance_url || extraData?.instanceUrl || "#";
        html = welcomeEmail(instance.owner_name, instance.business_name, url, branding);
        subject = `Bem-vinda ao teu espaço de gestão — ${instance.business_name}`;
        break;
      }
      case "sepa-setup": {
        const setupUrl = extraData?.setupUrl || "#";
        html = sepaSetupEmail(instance.owner_name, setupUrl, branding);
        subject = "Falta um passo para activar a tua subscrição";
        break;
      }
      case "payment-failed": {
        const now = new Date();
        const monthYear = extraData?.monthYear || `${now.toLocaleString("pt-PT", { month: "long" })} ${now.getFullYear()}`;
        const updateUrl = extraData?.updatePaymentUrl || "#";
        html = paymentFailedEmail(instance.owner_name, monthYear, updateUrl, branding);
        subject = "Problema com o teu pagamento";
        break;
      }
      case "renewal-reminder": {
        const renewalDate = extraData?.renewalDate || "";
        const amount = extraData?.amount || "0";
        html = renewalReminderEmail(instance.owner_name, renewalDate, amount, branding);
        subject = "A tua subscrição renova em breve";
        break;
      }
      default:
        throw new Error(`Unknown template: ${template}`);
    }

    // Send via Resend connector
    const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const emailRes = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": resendKey,
      },
      body: JSON.stringify({
        from: `${branding.business_name} <onboarding@resend.dev>`,
        to: [instance.owner_email],
        subject,
        html,
      }),
    });

    if (!emailRes.ok) {
      const errBody = await emailRes.text();
      log("Resend error", { status: emailRes.status, body: errBody });
      throw new Error(`Resend error: ${emailRes.status}`);
    }

    await supabase.from("activity_log").insert({
      instance_id: instanceId,
      action: `Email "${template}" enviado`,
      details: `Enviado para ${instance.owner_email}`,
      performed_by: "system",
    });

    log("Email sent successfully", { template, to: instance.owner_email });

    return new Response(JSON.stringify({ success: true }), {
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
