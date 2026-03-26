import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { welcomeEmail, paymentFailedEmail } from "../_shared/emailTemplates.ts";

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

    const { data: instance, error: instErr } = await supabase
      .from("instances")
      .select("*")
      .eq("id", instanceId)
      .single();

    if (instErr || !instance) throw new Error("Instance not found");

    let html: string;
    let subject: string;

    switch (template) {
      case "welcome": {
        const url = instance.instance_url || extraData?.instanceUrl || "#";
        html = welcomeEmail(instance.owner_name, instance.business_name, url);
        subject = `Bem-vinda ao teu espaço de gestão — ${instance.business_name}`;
        break;
      }
      case "payment-failed": {
        const now = new Date();
        const monthYear = extraData?.monthYear || `${now.toLocaleString("pt-PT", { month: "long" })} ${now.getFullYear()}`;
        const updateUrl = extraData?.updatePaymentUrl || "#";
        html = paymentFailedEmail(instance.owner_name, monthYear, updateUrl);
        subject = "Problema com o teu pagamento";
        break;
      }
      default:
        throw new Error(`Unknown template: ${template}`);
    }

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
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
