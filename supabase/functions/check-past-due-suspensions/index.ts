import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const log = (step: string, details?: any) => {
  console.log(`[PAST-DUE-CHECK] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    log("Starting past-due check");

    // Find subscriptions that are past_due
    const { data: pastDueSubs, error } = await supabase
      .from("subscriptions")
      .select("id, instance_id, status, created_at")
      .eq("status", "past_due");

    if (error) throw error;
    if (!pastDueSubs || pastDueSubs.length === 0) {
      log("No past-due subscriptions found");
      return new Response(JSON.stringify({ suspended: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check activity_log for when status changed to past_due
    let suspendedCount = 0;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    for (const sub of pastDueSubs) {
      // Check if instance is already suspended
      const { data: instance } = await supabase
        .from("instances")
        .select("status")
        .eq("id", sub.instance_id)
        .single();

      if (instance?.status === "suspended") continue;

      // Look for the most recent payment failure log
      const { data: logs } = await supabase
        .from("activity_log")
        .select("created_at")
        .eq("instance_id", sub.instance_id)
        .eq("action", "Pagamento falhado")
        .order("created_at", { ascending: false })
        .limit(1);

      const firstFailDate = logs?.[0]?.created_at;
      if (firstFailDate && new Date(firstFailDate) < sevenDaysAgo) {
        // Suspend instance
        await supabase.from("instances").update({ status: "suspended" }).eq("id", sub.instance_id);
        await supabase.from("activity_log").insert({
          instance_id: sub.instance_id,
          action: "Instância suspensa automaticamente",
          details: "Pagamento em atraso há mais de 7 dias",
          performed_by: "system-cron",
        });
        suspendedCount++;
        log("Instance suspended", { instanceId: sub.instance_id });
      }
    }

    log("Check completed", { suspendedCount });
    return new Response(JSON.stringify({ suspended: suspendedCount }), {
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
