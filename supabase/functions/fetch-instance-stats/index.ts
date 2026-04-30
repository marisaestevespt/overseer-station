// Fetches metrics from a client instance's admin-stats endpoint and persists them.
// Auth: requires staff role (super_admin / admin / support).
import { z } from "npm:zod@3.23.8";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { buildCorsHeaders, getServiceClient, jsonResponse } from "../_shared/auth.ts";

const BodySchema = z.object({
  instance_id: z.string().uuid(),
});

const STAFF_ROLES = ["super_admin", "admin", "support"] as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: buildCorsHeaders(req) });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, req);

  // --- Auth: require staff role ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Unauthorized" }, 401, req);
  }
  const token = authHeader.slice("Bearer ".length);
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims?.sub) {
    return jsonResponse({ error: "Unauthorized" }, 401, req);
  }
  const userId = claimsData.claims.sub as string;

  const service = getServiceClient();
  const { data: roleRow } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", STAFF_ROLES as unknown as string[])
    .maybeSingle();
  if (!roleRow) {
    return jsonResponse({ error: "Forbidden" }, 403, req);
  }

  // --- Parse body ---
  let body: unknown;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400, req); }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ error: parsed.error.flatten().fieldErrors }, 400, req);
  }
  const { instance_id } = parsed.data;

  // --- Fetch instance config ---
  const { data: instance, error: instErr } = await service
    .from("instances")
    .select("id, business_name, stats_url, stats_key")
    .eq("id", instance_id)
    .maybeSingle();
  if (instErr) return jsonResponse({ error: "DB error" }, 500, req);
  if (!instance) return jsonResponse({ error: "Instance not found" }, 404, req);
  if (!instance.stats_url || !instance.stats_key) {
    return jsonResponse({ error: "Stats endpoint not configured" }, 400, req);
  }

  // --- Call remote stats endpoint ---
  let payload: unknown = null;
  let httpStatus = 0;
  let errorMessage: string | null = null;
  try {
    const res = await fetch(instance.stats_url, {
      method: "GET",
      headers: { "x-admin-key": instance.stats_key, "Accept": "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    httpStatus = res.status;
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      errorMessage = `HTTP ${res.status} ${text.slice(0, 200)}`;
    } else {
      try { payload = await res.json(); }
      catch { errorMessage = "Invalid JSON in response"; }
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "fetch failed";
  }

  if (errorMessage) {
    await service.from("activity_log").insert({
      instance_id,
      action: "Recolha de estatísticas falhou",
      details: errorMessage,
      performed_by: claimsData.claims.email ?? "system",
    });
    return jsonResponse({ error: errorMessage, status: httpStatus }, 502, req);
  }

  // --- Persist ---
  const now = new Date().toISOString();
  await service
    .from("instances")
    .update({ last_stats: payload, last_stats_at: now })
    .eq("id", instance_id);

  await service.from("activity_log").insert({
    instance_id,
    action: "Estatísticas atualizadas",
    performed_by: claimsData.claims.email ?? "system",
  });

  return jsonResponse({ ok: true, stats: payload, fetched_at: now }, 200, req);
});
