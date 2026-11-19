import stringWidth from "string-width";
/** Strip OSC/DCS/APC/CSI (7/8 bit), then all controls. External text is never ANSI. */
export function safeText(value: unknown): string {
  return String(value ?? "")
    .replace(/(?:\x1b\]|\x9d)[\s\S]*?(?:\x07|\x1b\\|\x9c|$)/g, "")
    .replace(/(?:\x1b[P_^]|[\x90\x98\x9e\x9f])[\s\S]*?(?:\x1b\\|\x9c|$)/g, "")
    .replace(/(?:\x1b\[|\x9b)[0-?]*[ -/]*[@-~]/g, "")
    .replace(/\x1b[ -/]*[@-~]/g, "")
    .replace(/[\x00-\x1f\x7f-\x9f]/g, " ");
}
export const graphemes = (value: string) =>
  [
    ...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(
      value,
    ),
  ].map((s) => s.segment);
export const cellWidth = (value: string) => stringWidth(safeText(value));
export function truncate(value: string, columns: number, marker = "…") {
  const text = safeText(value),
    width = Math.max(0, Math.floor(columns));
  if (cellWidth(text) <= width) return text;
  const suffix = cellWidth(marker) <= width ? marker : "";
  let result = "";
  for (const g of graphemes(text)) {
    if (cellWidth(result + g + suffix) > width) break;
    result += g;
  }
  return result + suffix;
}
export function wrap(value: string, columns: number): string[] {
  const width = Math.max(1, Math.floor(columns)),
    lines: string[] = [];
  let line = "";
  for (const g of graphemes(safeText(value))) {
    if (cellWidth(g) > width) {
      if (line) lines.push(line);
      lines.push("?");
      line = "";
      continue;
    }
    if (cellWidth(line + g) > width) {
      lines.push(line);
      line = "";
    }
    line += g;
  }
  if (line || !lines.length) lines.push(line);
  return lines;
}
