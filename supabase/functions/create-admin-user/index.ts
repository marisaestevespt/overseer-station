import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import {
  corsHeaders,
  buildCorsHeaders,
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
  const limited = await enforceRateLimit(ctx.ip, "create-admin-user", 10, 60 * 60 * 1000);
  if (limited) return limited;

  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body as { email?: string };
    if (!email || typeof email !== "string" || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
      return jsonResponse({ error: "Valid email is required" }, 400);
    }

    const service = getServiceClient();

    // Check existing
    const { data: existingUsers } = await service.auth.admin.listUsers();
    const existing = existingUsers?.users?.find((u) => u.email === email);
    if (existing) {
      await logAdminAction(ctx, "create_admin_user_skipped_existing", "auth.user", existing.id, {
        target_email: email,
      });
      return jsonResponse({ message: "User already exists", userId: existing.id });
    }

    const tempPassword = crypto.randomUUID() + "Aa1!";
    const { data, error } = await service.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: false,
    });

    if (error) {
      await logAdminAction(ctx, "create_admin_user_failed", "auth.user", null, {
        target_email: email,
        reason: error.message,
      });
      return jsonResponse({ error: error.message }, 500);
    }

    // Send a magic link / recovery email so the new user can set their password
    await service.auth.admin.generateLink({ type: "magiclink", email });

    await logAdminAction(ctx, "create_admin_user", "auth.user", data.user?.id ?? null, {
      target_email: email,
    });

    return jsonResponse({
      success: true,
      userId: data.user?.id,
      message: "User created. They need to confirm their email and set a password.",
    });
  } catch (error) {
    console.error("create-admin-user error", error);
    await logAdminAction(ctx, "create_admin_user_error", "auth.user", null, {
      error: String(error),
    });
    return jsonResponse({ error: "Internal error" }, 500);
  }
});
