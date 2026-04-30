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
  email: z.string().trim().email().max(255),
  role: z.enum(["super_admin", "admin", "support"]),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: buildCorsHeaders(req) });

  const ctx = await requireSuperAdmin(req);
  if (ctx instanceof Response) return ctx;

  const rate = await enforceRateLimit(ctx.ip, "invite-user", 10, 60 * 60 * 1000);
  if (rate) return rate;

  let body: unknown;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400); }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) return jsonResponse({ error: parsed.error.flatten().fieldErrors }, 400);

  const { email, role } = parsed.data;
  const service = getServiceClient();

  // Guarda role pendente (será aplicado pelo trigger quando o user confirmar)
  const { error: pendingErr } = await service
    .from("pending_user_invites")
    .upsert({ email, role, invited_by: ctx.userId }, { onConflict: "email" });
  if (pendingErr) {
    console.error("pending insert failed", pendingErr);
    return jsonResponse({ error: "Failed to register invite" }, 500);
  }

  const redirectTo = Deno.env.get("ALLOWED_ORIGIN") ?? undefined;
  const { data, error } = await service.auth.admin.inviteUserByEmail(email, redirectTo ? { redirectTo } : undefined);
  if (error) {
    console.error("inviteUserByEmail failed", error);
    return jsonResponse({ error: error.message }, 400);
  }

  await logAdminAction(ctx, "user_invited", "user", data.user?.id ?? null, { email, role });
  return jsonResponse({ ok: true, user_id: data.user?.id ?? null });
});
