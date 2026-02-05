export function formatCurrency(value: number | string): string {
  if (value === null || value === undefined || value === "") return "0,00";

  // Normalize input to a number:
  let num: number;
  if (typeof value === "number") {
    num = value;
  } else {
    let str = value.toString().trim();

    if (str.includes(".") && str.includes(",")) {
      str = str.replace(/\./g, "").replace(",", ".");
    } else if (str.includes(",") && !str.includes(".")) {
      str = str.replace(",", ".");
    }

    num = parseFloat(str);
  }

  if (!isFinite(num) || isNaN(num)) return "0,00";

  return num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
