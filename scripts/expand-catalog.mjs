// Migração idempotente: conserva todos os tokens anteriores e adiciona extensões.
import { readFileSync, writeFileSync } from "node:fs";
const path = new URL("../packages/tokens/source/catalog.json", import.meta.url);
const catalog = JSON.parse(readFileSync(path, "utf8"));
function add(id, type, value, description, layer = "component") {
  if (catalog.some((t) => t.id === id)) return;
  catalog.push({
    id,
    path: id.split("."),
    cssVar: `--in-${id.replaceAll(".", "-")}`,
    type,
    value,
    layer,
    category: id.split(".")[0],
    subcategory: id.split(".")[1],
    description,
    status: "extension",
    consumerFacing: true,
    sourceSection: "Expansão 1.2 / Biblioteca e interoperabilidade",
    meta: {
      intent: description,
      usage: [description],
      avoid: ["Não substituir tokens semânticos existentes."],
      a11y: "Manter rótulos, foco visível e contraste; significado não depende apenas de cor.",
      examples: {
        good: `var(--in-${id.replaceAll(".", "-")})`,
        bad: "Valor avulso no componente.",
      },
    },
  });
}
const dimension = (n, unit = "px") => ({ value: n, unit });
for (const [id, n] of [
  ["avatar.size.sm", 24],
  ["avatar.size.md", 40],
  ["avatar.size.lg", 64],
  ["dialog.width", 560],
  ["chart.line.width", 3],
  ["chart.marker.size", 6],
  ["chart.grid.width", 1],
])
  add(id, "dimension", dimension(n), `Dimensão de ${id}.`);
for (const [id, ref] of Object.entries({
  "space.small": "space.200",
  "space.medium": "space.400",
  "space.large": "space.600",
  "content.measure": "layout.content.reading",
  "content.width": "layout.content.standard",
  "card.elevation": "elevation.0",
  "alert.icon.size": "icon.size.default",
  "color.icon.default": "color.text.primary",
  "color.icon.muted": "color.text.secondary",
  "color.state.hover": "color.background.raised",
  "color.state.focus": "color.focus.ring",
  "color.state.disabled": "color.action.disabled.foreground",
})) {
  const target = catalog.find((t) => t.id === ref);
  add(
    id,
    target.type,
    `{${ref}}`,
    `Alias semântico de ${ref}.`,
    id.startsWith("card.") || id.startsWith("alert.")
      ? "component"
      : "semantic",
  );
}
add(
  "z.tooltip",
  "number",
  80,
  "Dica acima das camadas interativas.",
  "semantic",
);
add(
  "layout.grid.columns",
  "number",
  12,
  "Grade fluida de doze colunas.",
  "semantic",
);
add(
  "chart.density.compact",
  "dimension",
  dimension(24),
  "Distância mínima entre marcas de gráfico.",
);
writeFileSync(path, JSON.stringify(catalog, null, 2) + "\n");
