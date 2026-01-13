export const extendedColorMap: Record<string, { hex: string }> = {
  green: { hex: "#16a349" },
  blue: { hex: "#2663eb" },
  purple: { hex: "#9333ea" },
  pink: { hex: "#dc2777" },
  red: { hex: "#dc2627" },
  orange: { hex: "#ea580b" },
  yellow: { hex: "#ca8a03" },
};

export const handleColorMap = (color: string) => {
  const colorObj = extendedColorMap[color] ?? extendedColorMap["green"];
  const hex = colorObj.hex;

  const bgStyle = { backgroundColor: `${hex}33` };
  const textStyle = { color: hex };

  return { bgStyle, textStyle };
};
