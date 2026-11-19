import type { ActionId, Binding } from "./contracts.ts";
export const DEFAULT_BINDINGS: readonly Binding[] = [
  ["navigate.up", "up", "Cima", "navigation"],
  ["navigate.down", "down", "Baixo", "navigation"],
  ["navigate.first", "home", "Home", "navigation"],
  ["navigate.last", "end", "End", "navigation"],
  ["navigate.pageUp", "pageup", "PageUp", "navigation"],
  ["navigate.pageDown", "pagedown", "PageDown", "navigation"],
  ["activate", "enter", "Enter", "panel"],
  ["toggle", "space", "Espaço", "navigation"],
  ["nextRegion", "tab", "Tab", "panel"],
  ["previousRegion", "shift+tab", "Shift+Tab", "panel"],
  ["back", "escape", "Esc", "panel"],
  ["help", "f1", "F1", "panel"],
  ["help", "?", "?", "navigation"],
  ["search", "/", "/", "navigation"],
].map(([action, key, label, scope]) => ({
  action: action as ActionId,
  key: key!,
  label: label!,
  scope: scope as Binding["scope"],
}));
export function resolveBindings(
  overrides: readonly Binding[] = [],
  reserved: readonly string[] = [],
  ctrlS = false,
): Binding[] {
  const replacements = new Set(overrides.map((b) => b.action));
  const bindings = [
    ...DEFAULT_BINDINGS.filter((b) => !replacements.has(b.action)),
    ...(ctrlS && !replacements.has("save")
      ? [
          {
            action: "save" as const,
            key: "ctrl+s",
            label: "Ctrl+S",
            scope: "panel" as const,
          },
        ]
      : []),
    ...overrides,
  ].filter((b) => !reserved.includes(b.key));
  const seen = new Set<string>();
  for (const b of bindings) {
    const id = `${b.scope}:${b.key}`;
    if (seen.has(id)) throw new Error(`Binding duplicado: ${id}`);
    seen.add(id);
  }
  return bindings;
}
export function keyAction(
  key: string,
  bindings: readonly Binding[],
  context: "navigation" | "field" | "operation",
  pasted = false,
): ActionId | undefined {
  if (pasted) return;
  return (
    bindings.find((b) => b.key === key && b.scope === context)?.action ??
    bindings.find(
      (b) =>
        b.key === key &&
        b.scope === "panel" &&
        (context !== "field" || !["?", "space"].includes(key)),
    )?.action
  );
}
export function keyHints(
  bindings: readonly Binding[],
  actions: Partial<Record<ActionId, string>>,
  separator = " · ",
) {
  return Object.entries(actions)
    .map(([action, label]) => {
      const b = bindings.find((b) => b.action === action);
      return b ? `${b.label} ${label}` : label;
    })
    .join(separator);
}
