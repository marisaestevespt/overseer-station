import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  corsHeaders,
  enforceRateLimit,
  getServiceClient,
  jsonResponse,
  logAdminAction,
  requireSuperAdmin,
} from "../_shared/auth.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // 1. Auth + role
  const ctxOrResponse = await requireSuperAdmin(req);
  if (ctxOrResponse instanceof Response) return ctxOrResponse;
  const ctx = ctxOrResponse;

  // 2. Rate limit
  const limited = await enforceRateLimit(ctx.ip, "setup-admin-password", 10, 60 * 60 * 1000);
  if (limited) return limited;

  try {
    const body = await req.json().catch(() => ({}));
    const { userId } = body as { userId?: string };
    if (!userId || typeof userId !== "string") {
      return jsonResponse({ error: "userId is required" }, 400);
    }

    const service = getServiceClient();

    // Look up the target user to get their email
    const { data: targetUser, error: lookupErr } = await service.auth.admin.getUserById(userId);
    if (lookupErr || !targetUser?.user?.email) {
      await logAdminAction(ctx, "setup_admin_password_failed", "auth.user", userId, {
        reason: "target user not found",
      });
      return jsonResponse({ error: "Target user not found" }, 404);
    }

    // 3. Send a recovery link instead of setting password directly.
    const { data: linkData, error: linkErr } = await service.auth.admin.generateLink({
      type: "recovery",
      email: targetUser.user.email,
    });

    if (linkErr) {
      await logAdminAction(ctx, "setup_admin_password_failed", "auth.user", userId, {
        target_email: targetUser.user.email,
        reason: linkErr.message,
      });
      return jsonResponse({ error: "Failed to generate recovery link" }, 500);
    }

    await logAdminAction(ctx, "setup_admin_password_link_sent", "auth.user", userId, {
      target_email: targetUser.user.email,
    });

    return jsonResponse({
      success: true,
      email: targetUser.user.email,
      message: "Recovery link generated and sent to user's email.",
      // Note: linkData.properties.action_link is also returned by Supabase; we omit it from the response
      // to avoid exposing a password-reset link to whoever calls this endpoint.
      action_link_generated: Boolean(linkData?.properties?.action_link),
    });
  } catch (error) {
    console.error("setup-admin-password error", error);
    await logAdminAction(ctx, "setup_admin_password_error", "auth.user", null, {
      error: String(error),
    });
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
