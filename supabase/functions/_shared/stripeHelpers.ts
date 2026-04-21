// Helpers partilhados para a API Stripe (basil 2025-08-27)
//
// Na API basil, `current_period_end` e `current_period_start` foram movidos
// da subscription para cada subscription_item (sub.items.data[i]).
// Estas funções abstraem essa diferença e funcionam mesmo se a Stripe
// reverter o comportamento ou para subscrições antigas.

// deno-lint-ignore no-explicit-any
type AnySub = any;

/** Devolve o current_period_end da subscription como timestamp Unix (segundos), ou null. */
export function getSubCurrentPeriodEnd(sub: AnySub): number | null {
  if (!sub) return null;
  // API basil: vive no item
  const fromItem = sub.items?.data?.[0]?.current_period_end;
  if (typeof fromItem === "number" && Number.isFinite(fromItem)) return fromItem;
  // Fallback API legada
  if (typeof sub.current_period_end === "number" && Number.isFinite(sub.current_period_end)) {
    return sub.current_period_end;
  }
  return null;
}

/** Converte para ISO string ou null se inválido. Nunca lança "Invalid time value". */
export function getSubCurrentPeriodEndISO(sub: AnySub): string | null {
  const ts = getSubCurrentPeriodEnd(sub);
  if (ts == null) return null;
  const d = new Date(ts * 1000);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
