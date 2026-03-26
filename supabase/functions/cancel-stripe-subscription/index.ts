import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) => {
  console.log(`[CANCEL-STRIPE-SUB] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return new Response(JSON.stringify({ error: "STRIPE_SECRET_KEY not set" }), { status: 500, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { instanceId } = await req.json();
    if (!instanceId) throw new Error("instanceId is required");

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("instance_id", instanceId)
      .maybeSingle();

    if (!sub?.stripe_subscription_id) throw new Error("No active Stripe subscription found");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    await stripe.subscriptions.cancel(sub.stripe_subscription_id);

    await supabase.from("subscriptions").update({ status: "cancelled" }).eq("id", sub.id);

    await supabase.from("activity_log").insert({
      instance_id: instanceId,
      action: "Subscrição cancelada manualmente",
      details: `Subscription ID: ${sub.stripe_subscription_id}`,
      performed_by: "admin",
    });

    log("Subscription cancelled", { instanceId, subId: sub.stripe_subscription_id });

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
