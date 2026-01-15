export function formatCurrency(value: number): string {
  if (!value) return "0,00";

  return value
    .toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
    .replace("R$", "")
    .trim();
}
