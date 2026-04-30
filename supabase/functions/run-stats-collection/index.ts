// Collects stats for all active instances. Called by pg_cron.
// Auth: shared cron secret OR no auth (since pg_net calls from inside DB).
import { getServiceClient, buildCorsHeaders, jsonResponse } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: buildCorsHeaders(req) });

  const service = getServiceClient();
  const { data: instances, error } = await service
    .from("instances")
    .select("id, business_name, stats_url, stats_key")
    .eq("status", "active")
    .not("stats_url", "is", null)
    .not("stats_key", "is", null);

  if (error) {
    console.error("Failed to load instances", error);
    return jsonResponse({ error: "DB error" }, 500, req);
  }

  const results = await Promise.all(
    (instances ?? []).map(async (inst) => {
      try {
        const res = await fetch(inst.stats_url!, {
          method: "GET",
          headers: { "x-admin-key": inst.stats_key!, "Accept": "application/json" },
          signal: AbortSignal.timeout(15_000),
        });
        if (!res.ok) {
          await service.from("activity_log").insert({
            instance_id: inst.id,
            action: "Recolha de estatísticas falhou (cron)",
            details: `HTTP ${res.status}`,
            performed_by: "cron",
          });
          return { id: inst.id, ok: false, status: res.status };
        }
        const payload = await res.json();
        await service
          .from("instances")
          .update({ last_stats: payload, last_stats_at: new Date().toISOString() })
          .eq("id", inst.id);
        return { id: inst.id, ok: true };
      } catch (err) {
        await service.from("activity_log").insert({
          instance_id: inst.id,
          action: "Recolha de estatísticas falhou (cron)",
          details: err instanceof Error ? err.message : "fetch failed",
          performed_by: "cron",
        });
        return { id: inst.id, ok: false, error: String(err) };
      }
    }),
  );

  return jsonResponse({ ok: true, processed: results.length, results }, 200, req);
});
