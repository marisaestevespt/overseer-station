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

  const rate = await enforceRateLimit(ctx.ip, "deactivate-user", 20, 60 * 60 * 1000);
  if (rate) return rate;

  let body: unknown;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400, req); }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten().fieldErrors }, 400, req);

  const { user_id } = parsed.data;
  if (user_id === ctx.userId) {
    return jsonResponse({ error: "Não te podes desativar a ti próprio." }, 400, req);
  }

  const service = getServiceClient();
  const { error } = await service.auth.admin.updateUserById(user_id, { ban_duration: "876000h" });
  if (error) {
    console.error("deactivate failed", error);
    return jsonResponse({ error: error.message }, 500, req);
  }

  await logAdminAction(ctx, "user_deactivated", "user", user_id, {});
  return jsonResponse({ ok: true }, req);
});
