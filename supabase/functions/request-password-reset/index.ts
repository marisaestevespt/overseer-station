import { z } from "npm:zod@3.23.8";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { buildCorsHeaders, corsHeaders, jsonResponse } from "../_shared/auth.ts";

const BodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  redirect_to: z.string().url().max(500).optional(),
});

// Resposta uniforme para evitar enumeração de utilizadores
const UNIFORM_RESPONSE = { ok: true, message: "Se o email existir, vais receber instruções." };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: buildCorsHeaders(req) });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, req);

  let body: unknown;
  try { body = await req.json(); } catch { return jsonResponse({ error: "Invalid JSON" }, 400, req); }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    // Mesmo com email inválido, devolve resposta uniforme (não dar pistas)
    return jsonResponse(UNIFORM_RESPONSE, req);
  }

  const { email, redirect_to } = parsed.data;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("cf-connecting-ip") ?? "unknown";
  const userAgent = req.headers.get("user-agent") ?? "unknown";

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // Rate limit: 5/h por email (chave: ip='email:<email>', endpoint='request-password-reset')
  const RATE_KEY = `email:${email}`;
  const ENDPOINT = "request-password-reset";
  const windowStart = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count } = await service
    .from("rate_limits")
    .select("count", { count: "exact", head: true })
    .eq("ip", RATE_KEY)
    .eq("endpoint", ENDPOINT)
    .gte("window_start", windowStart);

  if ((count ?? 0) >= 5) {
    // Excedeu — log, mas não envia. Resposta igual.
    await service.from("activity_log").insert({
      action: "password_reset_rate_limited",
      target_type: "email",
      metadata: { email },
      ip,
      user_agent: userAgent,
      performed_by: email,
    });
    return jsonResponse(UNIFORM_RESPONSE, req);
  }

  await service.from("rate_limits").insert({ ip: RATE_KEY, endpoint: ENDPOINT, count: 1 });

  // Sempre regista o pedido (independentemente de o email existir)
  await service.from("activity_log").insert({
    action: "password_reset_requested",
    target_type: "email",
    metadata: { email },
    ip,
    user_agent: userAgent,
    performed_by: email,
  });

  // Tentar enviar — usa resetPasswordForEmail (envia automaticamente se user existir)
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    await userClient.auth.resetPasswordForEmail(email, {
      redirectTo: redirect_to,
    });
  } catch (err) {
    console.error("resetPasswordForEmail failed", err);
    // Não revelar erro ao cliente
  }

  return jsonResponse(UNIFORM_RESPONSE, req);
});
