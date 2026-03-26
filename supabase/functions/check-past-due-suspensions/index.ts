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

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

  try {
    log("Starting past-due check and renewal reminders");

    // ── 1. PAST-DUE SUSPENSIONS ──
    const { data: pastDueSubs, error } = await supabase
      .from("subscriptions")
      .select("id, instance_id, status, created_at")
      .eq("status", "past_due");

    if (error) throw error;

    let suspendedCount = 0;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    if (pastDueSubs && pastDueSubs.length > 0) {
      for (const sub of pastDueSubs) {
        const { data: instance } = await supabase
          .from("instances")
          .select("status")
          .eq("id", sub.instance_id)
          .single();

        if (instance?.status === "suspended") continue;

        const { data: logs } = await supabase
          .from("activity_log")
          .select("created_at")
          .eq("instance_id", sub.instance_id)
          .eq("action", "Pagamento falhado")
          .order("created_at", { ascending: false })
          .limit(1);

        const firstFailDate = logs?.[0]?.created_at;
        if (firstFailDate && new Date(firstFailDate) < sevenDaysAgo) {
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
    }

    // ── 2. RENEWAL REMINDERS (7 days before current_period_end) ──
    const now = new Date();
    const inSevenDays = new Date();
    inSevenDays.setDate(now.getDate() + 7);

    // Window: renewals between 6.5 and 7.5 days from now (covers daily cron)
    const windowStart = new Date(inSevenDays);
    windowStart.setHours(windowStart.getHours() - 12);
    const windowEnd = new Date(inSevenDays);
    windowEnd.setHours(windowEnd.getHours() + 12);

    const { data: renewingSubs, error: renewErr } = await supabase
      .from("subscriptions")
      .select("id, instance_id, current_period_end, monthly_amount")
      .eq("status", "active")
      .gte("current_period_end", windowStart.toISOString())
      .lte("current_period_end", windowEnd.toISOString());

    if (renewErr) throw renewErr;

    let remindersCount = 0;

    if (renewingSubs && renewingSubs.length > 0) {
      // Check current month boundaries for dedup
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

      for (const sub of renewingSubs) {
        // Check if reminder already sent this month
        const { data: existing } = await supabase
          .from("activity_log")
          .select("id")
          .eq("instance_id", sub.instance_id)
          .eq("action", "renewal_reminder")
          .gte("created_at", monthStart)
          .lte("created_at", monthEnd)
          .limit(1);

        if (existing && existing.length > 0) {
          log("Renewal reminder already sent", { instanceId: sub.instance_id });
          continue;
        }

        // Format renewal date in pt-PT
        const renewalDate = new Date(sub.current_period_end).toLocaleDateString("pt-PT", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });

        const amount = String(sub.monthly_amount);

        // Send email via send-email function
        const emailRes = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            template: "renewal-reminder",
            instanceId: sub.instance_id,
            extraData: { renewalDate, amount },
          }),
        });

        if (!emailRes.ok) {
          const errText = await emailRes.text();
          log("Failed to send renewal reminder", { instanceId: sub.instance_id, error: errText });
          continue;
        }

        // Log in activity_log
        await supabase.from("activity_log").insert({
          instance_id: sub.instance_id,
          action: "renewal_reminder",
          details: `Aviso de renovação enviado — renova a ${renewalDate}, ${amount}€`,
          performed_by: "system-cron",
        });

        remindersCount++;
        log("Renewal reminder sent", { instanceId: sub.instance_id, renewalDate });
      }
    }

    log("Check completed", { suspendedCount, remindersCount });
    return new Response(JSON.stringify({ suspended: suspendedCount, reminders: remindersCount }), {
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
