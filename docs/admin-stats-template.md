# Template — edge function `admin-stats` (projeto-mãe Lyrata)

Esta edge function deve ser instalada em **cada instância cliente** (projeto Lovable do cliente, não neste painel).
O painel admin chama-a periodicamente para recolher métricas.

## 1. Adicionar secret no projeto cliente

No projeto Lovable do cliente, adicionar o secret:

- **Nome:** `ADMIN_STATS_KEY`
- **Valor:** a chave gerada no painel admin (botão "Gerar nova chave" no card de setup da instância)

## 2. Criar edge function `admin-stats`

Pedir ao agente Lovable do projeto cliente:

> "Cria uma edge function chamada `admin-stats` com o conteúdo abaixo. Ela valida o header `x-admin-key` contra o secret `ADMIN_STATS_KEY` e devolve métricas agregadas do negócio."

### `supabase/functions/admin-stats/index.ts`

```typescript
// Endpoint de métricas consumido pelo painel admin Lyrata.
// Auth: header x-admin-key === secret ADMIN_STATS_KEY.
import { z } from "npm:zod@3.23.8";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "x-admin-key, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  // --- Validar chave ---
  const expected = Deno.env.get("ADMIN_STATS_KEY");
  const provided = req.headers.get("x-admin-key");
  if (!expected || !provided) return json({ error: "Unauthorized" }, 401);
  // Comparação em tempo constante simples
  if (expected.length !== provided.length) return json({ error: "Unauthorized" }, 401);
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  if (diff !== 0) return json({ error: "Unauthorized" }, 401);

  // --- Recolher métricas ---
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    // ⚠️ Personalizar conforme as tabelas do projeto cliente.
    // Exemplos típicos:
    const [users, activeUsers, records] = await Promise.all([
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("id", { count: "exact", head: true })
        .gte("last_seen_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from("records").select("id", { count: "exact", head: true }),
    ]);

    return json({
      collected_at: new Date().toISOString(),
      users_total: users.count ?? 0,
      users_active_30d: activeUsers.count ?? 0,
      records_total: records.count ?? 0,
      // Adicionar aqui métricas específicas do negócio
    });
  } catch (err) {
    console.error("admin-stats error", err);
    return json({ error: "Internal error" }, 500);
  }
});
```

### `supabase/config.toml` (no projeto cliente)

A função deve ser pública (sem JWT do utilizador), porque é chamada server-to-server:

```toml
[functions.admin-stats]
verify_jwt = false
```

## 3. Registar no painel admin

1. Copiar URL: `https://{subdomain}.lyrata.pt/functions/v1/admin-stats`
2. Colar URL e chave nos campos da instância (card "Configurações Gerais")
3. Clicar **"Atualizar agora"** no card "Métricas Remotas" para validar

## Schema esperado pelo painel

O painel grava o JSON tal como é recebido em `instances.last_stats`. Qualquer estrutura é aceite, mas recomenda-se incluir sempre:

- `collected_at` — ISO timestamp
- chaves numéricas para os KPIs (o card mostra-as automaticamente)

## Segurança

- A chave **nunca** deve aparecer no frontend do cliente.
- Rodar a chave: gerar nova no painel → atualizar secret `ADMIN_STATS_KEY` no projeto cliente → atualizar campo no painel.
