import { z } from "npm:zod@3.23.8";
import {
  corsHeaders,
  jsonResponse,
  requireSuperAdmin,
  enforceRateLimit,
  getServiceClient,
  logAdminAction,
} from "../_shared/auth.ts";

const BodySchema = z.object({ user_id: z.string().uuid() });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: buildCorsHeaders(req) });

  const ctx = await requireSuperAdmin(req);
  if (ctx instanceof Response) return ctx;

  const rate = await enforceRateLimit(ctx.ip, "reactivate-user", 20, 60 * 60 * 1000);
  if (rate) return rate;

  let body: unknown;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400, req); }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten().fieldErrors }, 400, req);

  const service = getServiceClient();
  const { error } = await service.auth.admin.updateUserById(parsed.data.user_id, { ban_duration: "none" });
  if (error) {
    console.error("reactivate failed", error);
    return jsonResponse({ error: error.message }, 500, req);
  }

  await logAdminAction(ctx, "user_reactivated", "user", parsed.data.user_id, {});
  return jsonResponse({ ok: true }, req);
});
