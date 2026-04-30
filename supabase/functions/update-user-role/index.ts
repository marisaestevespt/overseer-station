import { z } from "npm:zod@3.23.8";
import {
  corsHeaders,
  jsonResponse,
  requireSuperAdmin,
  enforceRateLimit,
  getServiceClient,
  logAdminAction,
} from "../_shared/auth.ts";

const BodySchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["super_admin", "admin", "support"]),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: buildCorsHeaders(req) });

  const ctx = await requireSuperAdmin(req);
  if (ctx instanceof Response) return ctx;

  const rate = await enforceRateLimit(ctx.ip, "update-user-role", 30, 60 * 60 * 1000);
  if (rate) return rate;

  let body: unknown;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400, req); }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten().fieldErrors }, 400, req);

  const { user_id, role } = parsed.data;

  if (user_id === ctx.userId) {
    return jsonResponse({ error: "Não podes alterar o teu próprio role." }, 400, req);
  }

  const service = getServiceClient();

  const { error: delErr } = await service.from("user_roles").delete().eq("user_id", user_id);
  if (delErr) {
    console.error("role delete failed", delErr);
    return jsonResponse({ error: "Failed to remove old role" }, 500, req);
  }

  const { error: insErr } = await service.from("user_roles").insert({ user_id, role });
  if (insErr) {
    console.error("role insert failed", insErr);
    return jsonResponse({ error: "Failed to assign new role" }, 500, req);
  }

  await logAdminAction(ctx, "role_changed", "user", user_id, { new_role: role });
  return jsonResponse({ ok: true }, req);
});
