/**
 * Normaliza um valor monetário em string, possivelmente em formato pt-BR ("1.234,56") ou com
 * ponto ("1234.56"), para number. Extraído de CategoryService.totalAmount (lógica antes
 * duplicada ali e em frontend/utils/stringToNumber.ts — ver backend/CLAUDE.md).
 */
export function parseMoneyString(value: string): number {
  const rawStr = String(value ?? "0").trim();

  let normalized = rawStr;
  if (rawStr.includes(".") && rawStr.includes(",")) {
    normalized = rawStr.replace(/\./g, "").replace(",", ".");
  } else if (rawStr.includes(",")) {
    normalized = rawStr.replace(",", ".");
  }

  return parseFloat(normalized);
}

/**
 * Formata um number de volta para a string com 2 casas decimais usada em Transaction.amount/
 * Category.totalAmount (equivalente a value.toFixed(2)).
 */
export function formatMoneyString(value: number): string {
  return value.toFixed(2);
}
