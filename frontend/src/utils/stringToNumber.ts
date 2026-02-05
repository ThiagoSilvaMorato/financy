export function stringToNumber(value: string): number {
  if (value === null || value === undefined || value.trim() === "") return 0;

  let normalized = value.trim();

  if (normalized.includes(".") && normalized.includes(",")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (normalized.includes(",")) {
    normalized = normalized.replace(",", ".");
  }

  const num = parseFloat(normalized);
  if (isNaN(num) || !isFinite(num)) return 0;

  return num;
}
