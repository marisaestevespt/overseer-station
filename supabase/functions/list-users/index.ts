import { corsHeaders, buildCorsHeaders, jsonResponse, requireSuperAdmin, getServiceClient } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: buildCorsHeaders(req) });

  const ctx = await requireSuperAdmin(req);
  if (ctx instanceof Response) return ctx;

  const service = getServiceClient();
  const { data: usersList, error: listErr } = await service.auth.admin.listUsers({ perPage: 200 });
  if (listErr) {
    console.error("listUsers failed", listErr);
    return jsonResponse({ error: "Failed to list users" }, 500);
  }

  const { data: roles, error: rolesErr } = await service.from("user_roles").select("user_id, role");
  if (rolesErr) {
    console.error("roles fetch failed", rolesErr);
    return jsonResponse({ error: "Failed to fetch roles" }, 500);
  }

  const { data: pending } = await service.from("pending_user_invites").select("email, role, created_at");

  const rolesByUser = new Map<string, string[]>();
  for (const r of roles ?? []) {
    const arr = rolesByUser.get(r.user_id) ?? [];
    arr.push(r.role);
    rolesByUser.set(r.user_id, arr);
  }

  const users = (usersList?.users ?? []).map((u) => ({
    id: u.id,
    email: u.email,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    email_confirmed_at: u.email_confirmed_at,
    banned_until: (u as { banned_until?: string | null }).banned_until ?? null,
    roles: rolesByUser.get(u.id) ?? [],
  }));

  return jsonResponse({ users, pending: pending ?? [] });
});
