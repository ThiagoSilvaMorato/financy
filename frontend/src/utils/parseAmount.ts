export const parseAmount = (value: number | string): number => {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return isFinite(value) ? value : 0;
  let str = String(value).trim();
  if (str.includes(".") && str.includes(",")) {
    str = str.replace(/\./g, "").replace(",", ".");
  } else if (str.includes(",") && !str.includes(".")) {
    str = str.replace(",", ".");
  }
  const n = parseFloat(str);
  return isFinite(n) ? n : 0;
};
