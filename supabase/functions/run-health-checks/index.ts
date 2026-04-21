import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: unknown) => {
  console.log(`[RUN-HEALTH-CHECKS] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const { data: instances, error } = await supabase
      .from("instances")
      .select("id, business_name, health_check_url, instance_url");

    if (error) throw error;
    if (!instances || instances.length === 0) {
      return new Response(JSON.stringify({ checked: 0, results: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("Checking instances", { count: instances.length });

    const results = await Promise.all(
      instances.map(async (inst) => {
        const url = inst.health_check_url || inst.instance_url;
        if (!url) {
          return { id: inst.id, name: inst.business_name, status: "unknown", reason: "no url" };
        }

        let status: "ok" | "error" = "error";
        let httpStatus: number | null = null;
        let errorMessage: string | null = null;

        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10_000);
          const res = await fetch(url, { method: "GET", signal: controller.signal });
          clearTimeout(timeout);
          httpStatus = res.status;
          status = res.ok ? "ok" : "error";
          if (!res.ok) errorMessage = `HTTP ${res.status}`;
        } catch (err) {
          errorMessage = err instanceof Error ? err.message : String(err);
        }

        await supabase
          .from("instances")
          .update({
            health_status: status,
            last_health_check: new Date().toISOString(),
          })
          .eq("id", inst.id);

        if (status === "error") {
          await supabase.from("activity_log").insert({
            instance_id: inst.id,
            action: "Health check falhou",
            details: errorMessage ?? `HTTP ${httpStatus}`,
            performed_by: "system",
          });
        }

        return { id: inst.id, name: inst.business_name, status, httpStatus, errorMessage };
      })
    );

    const okCount = results.filter((r) => r.status === "ok").length;
    const errorCount = results.filter((r) => r.status === "error").length;

    log("Done", { ok: okCount, error: errorCount });

    return new Response(
      JSON.stringify({ checked: results.length, ok: okCount, error: errorCount, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
