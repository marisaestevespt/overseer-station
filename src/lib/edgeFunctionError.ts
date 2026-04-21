/**
 * Devolve uma descrição amigável (PT-PT) para erros de supabase.functions.invoke.
 * Para erros de rede / função indisponível devolve uma mensagem genérica útil;
 * para outros erros mantém a mensagem original.
 */
export function describeEdgeFunctionError(error: unknown, functionName?: string): string {
  if (!error) return "Erro inesperado.";

  const name = (error as { name?: string }).name ?? "";
  const message = (error as { message?: string }).message ?? String(error);

  const isNetwork =
    name === "FunctionsFetchError" ||
    /failed to (send|fetch).*edge function/i.test(message) ||
    /failed to fetch/i.test(message) ||
    /networkerror/i.test(message);

  if (isNetwork) {
    const fnLabel = functionName ? ` "${functionName}"` : "";
    return `Não foi possível contactar o servidor. A função${fnLabel} pode não estar disponível. Verifica a ligação e tenta novamente.`;
  }

  return message;
}
