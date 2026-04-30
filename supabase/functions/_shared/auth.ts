// Shared helpers for admin edge functions: JWT validation, role check, rate limiting, audit log.
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2.57.2";

const ALLOWED_ORIGIN_RAW = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
const ALLOWED_ORIGINS = ALLOWED_ORIGIN_RAW.split(",").map((s) => s.trim()).filter(Boolean);
const ALLOW_ALL = ALLOWED_ORIGINS.includes("*");

// Always allow Lovable preview/sandbox domains (regex) so dev iframes work
const LOVABLE_PREVIEW_REGEX = /^https:\/\/[a-z0-9-]+\.(lovableproject\.com|lovable\.app|lovable\.dev)$/i;

function resolveOrigin(origin: string | null): string {
  if (ALLOW_ALL) return origin ?? "*";
  if (!origin) return ALLOWED_ORIGINS[0] ?? "*";
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  if (LOVABLE_PREVIEW_REGEX.test(origin)) return origin;
  return ALLOWED_ORIGINS[0] ?? "*";
}

const BASE_CORS_HEADERS = {
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

export function buildCorsHeaders(req: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": resolveOrigin(req.headers.get("Origin")),
    ...BASE_CORS_HEADERS,
  };
}

// Backwards-compatible static headers (uses first allowed origin or "*")
export const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOW_ALL ? "*" : (ALLOWED_ORIGINS[0] ?? "*"),
  ...BASE_CORS_HEADERS,
};

export function jsonResponse(body: unknown, status = 200, req?: Request) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...(req ? buildCorsHeaders(req) : corsHeaders), "Content-Type": "application/json" },
  });
}

export function getServiceClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

export interface AdminContext {
  userId: string;
  email: string | null;
  ip: string;
  userAgent: string;
}

/**
 * Validates JWT and confirms the caller has the super_admin role.
 * Returns either an AdminContext or a Response (401/403) to be returned directly.
 */
export async function requireSuperAdmin(req: Request): Promise<AdminContext | Response> {
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

  const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
  if (claimsError || !claimsData?.claims?.sub) {
    return jsonResponse({ error: "Unauthorized" }, 401, req);
  }

  const userId = claimsData.claims.sub as string;
  const email = (claimsData.claims.email as string | undefined) ?? null;

  // Check role using service client (bypasses RLS, but explicit query)
  const service = getServiceClient();
  const { data: roleRow, error: roleError } = await service
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "super_admin")
    .maybeSingle();

  if (roleError) {
    console.error("role lookup failed", roleError);
    return jsonResponse({ error: "Forbidden" }, 403, req);
  }
  if (!roleRow) {
    return jsonResponse({ error: "Forbidden" }, 403, req);
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("cf-connecting-ip")
    ?? "unknown";
  const userAgent = req.headers.get("user-agent") ?? "unknown";

  return { userId, email, ip, userAgent };
}

/**
 * Simple SQL-backed rate limit: max `limit` calls per `windowMs` per (ip, endpoint).
 * Returns null if allowed, or a 429 Response if exceeded.
 */
export async function enforceRateLimit(
  ip: string,
  endpoint: string,
  limit = 10,
  windowMs = 60 * 60 * 1000,
  req?: Request,
): Promise<Response | null> {
  const service = getServiceClient();
  const now = Date.now();
  const windowStart = new Date(now - windowMs).toISOString();

  const { count, error } = await service
    .from("rate_limits")
    .select("count", { count: "exact", head: true })
    .eq("ip", ip)
    .eq("endpoint", endpoint)
    .gte("window_start", windowStart);

  if (error) {
    console.error("rate limit lookup failed", error);
    // Fail closed for safety
    return jsonResponse({ error: "Rate limit check failed" }, 503, req);
  }

  if ((count ?? 0) >= limit) {
    return jsonResponse({ events: "Too many requests", error: "Too many requests" }, 429, req);
  }

  await service.from("rate_limits").insert({ ip, endpoint, count: 1 });
  return null;
}

export async function logAdminAction(
  ctx: AdminContext,
  action: string,
  targetType: string,
  targetId: string | null,
  metadata: Record<string, unknown> = {},
) {
  const service = getServiceClient();
  await service.from("activity_log").insert({
    user_id: ctx.userId,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata: { ...metadata, email: ctx.email },
    ip: ctx.ip,
    user_agent: ctx.userAgent,
    performed_by: ctx.email ?? ctx.userId,
  });
}
