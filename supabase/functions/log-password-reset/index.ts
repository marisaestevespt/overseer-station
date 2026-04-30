import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

const corsHeaders = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: buildCorsHeaders(req) });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);
  const token = authHeader.slice("Bearer ".length);

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: claimsData, error } = await userClient.auth.getClaims(token);
  if (error || !claimsData?.claims?.sub) return jsonResponse({ error: "Unauthorized" }, 401);

  const userId = claimsData.claims.sub as string;
  const email = (claimsData.claims.email as string | undefined) ?? null;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("cf-connecting-ip") ?? "unknown";
  const userAgent = req.headers.get("user-agent") ?? "unknown";

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  await service.from("activity_log").insert({
    action: "password_reset_completed",
    target_type: "user",
    target_id: userId,
    metadata: { email },
    ip,
    user_agent: userAgent,
    performed_by: email ?? userId,
    user_id: userId,
  });

  return jsonResponse({ ok: true });
});
