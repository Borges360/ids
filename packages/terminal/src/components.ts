import type { Binding, Choice, MenuItem } from "./contracts.ts";
import type { SettingsSession } from "./settings.ts";
import { keyHints } from "./keyboard.ts";
import { cellWidth, safeText, truncate, wrap } from "./text.ts";
export interface View {
  lines: string[];
  focusedLine: number;
  fullText: string[];
}
const view = (lines: string[], focusedLine = 0): View => ({
  lines: lines.map(safeText),
  focusedLine,
  fullText: lines.map(safeText),
});
export function MenuList(items: readonly MenuItem[], focusedId: string): View {
  const lines = items.map(
    (i) =>
      `${i.id === focusedId ? ">" : " "} ${i.label}${i.value !== undefined ? `: ${i.value}` : ""}${i.kind === "route" ? " >" : i.kind === "action" ? " [ação]" : ""}${i.disabled ? ` [indisponível: ${i.disabled}]` : ""}`,
  );
  return view(
    lines.length ? lines : ["Nenhum item. Altere a busca ou volte."],
    Math.max(
      0,
      items.findIndex((i) => i.id === focusedId),
    ),
  );
}
export function SettingsList(session: SettingsSession, columns = 80): View {
  const lines: string[] = [];
  let focusedLine = 0;
  for (const f of session.fields) {
    const focused = f.id === session.focusedId;
    if (focused) focusedLine = lines.length;
    const value =
      f.kind === "secret" ? "[protegido]" : String(session.effective[f.id]);
    const origin = f.override ? ` [origem: ${f.override.source}]` : "";
    if (columns < 60)
      lines.push(`${focused ? ">" : " "} ${f.label}`, `  ${value}${origin}`);
    else lines.push(`${focused ? ">" : " "} ${f.label}: ${value}${origin}`);
    if (session.errors[f.id]) lines.push(`  Erro: ${session.errors[f.id]}`);
  }
  return view(lines, focusedLine);
}
export function TextInput(label: string, value: string, error = ""): View {
  return view([label, value, ...(error ? [`Erro: ${error}`] : [])]);
}
export function SecretInput(label: string, error = ""): View {
  return view([
    label,
    "[entrada protegida]",
    ...(error ? [`Erro: ${error}`] : []),
  ]);
}
export function Select(
  label: string,
  choices: readonly Choice[],
  focusedId: string,
  selectedId: string,
): View {
  return view(
    [
      label,
      ...choices.map(
        (c) =>
          `${c.id === focusedId ? ">" : " "} (${c.id === selectedId ? "x" : " "}) ${c.label}${c.disabled ? ` [indisponível: ${c.disabled}]` : ""}`,
      ),
    ],
    1 +
      Math.max(
        0,
        choices.findIndex((c) => c.id === focusedId),
      ),
  );
}
export function MultiSelect(
  label: string,
  choices: readonly Choice[],
  focusedId: string,
  selected: readonly string[],
): View {
  return view(
    [
      `${label} — ${selected.length} selecionados`,
      ...choices.map(
        (c) =>
          `${c.id === focusedId ? ">" : " "} [${selected.includes(c.id) ? "x" : " "}] ${c.label}${c.disabled ? ` [indisponível: ${c.disabled}]` : ""}`,
      ),
      "[Concluir seleção]",
    ],
    1 +
      Math.max(
        0,
        choices.findIndex((c) => c.id === focusedId),
      ),
  );
}
export function SearchField(query: string, count: number): View {
  return view([
    `Buscar: ${query} [Limpar busca]`,
    count
      ? `${count} resultados`
      : "Nenhum resultado para este filtro. Limpe a busca.",
  ]);
}
export function ActionBar(
  actions: readonly { id: string; label: string; disabled?: string }[],
  focusedId?: string,
): View {
  return view([
    actions
      .map(
        (a) =>
          `${a.id === focusedId ? ">" : ""}[${a.label}]${a.disabled ? ` Indisponível: ${a.disabled}` : ""}`,
      )
      .join(" "),
  ]);
}
export function KeyHints(
  bindings: readonly Binding[],
  actions: Parameters<typeof keyHints>[1],
  ascii = false,
): View {
  return view([keyHints(bindings, actions, ascii ? " | " : " · ")]);
}
export function Breadcrumbs(parts: readonly string[]): View {
  return view([parts.join(" / ")]);
}
export function ConfirmAction(
  object: string,
  consequence: string,
  destination: string,
  label: string,
): View {
  return view(
    [
      `Objeto: ${object}`,
      `Destino: ${destination}`,
      consequence,
      "> [Continuar editando]",
      `  [${label}]`,
    ],
    3,
  );
}
export function ChangeSummary(
  changes: readonly { label: string; before: unknown; after: unknown }[],
  scope: string,
): View {
  return view([
    `Alterações em ${scope}`,
    ...changes.map((c) => `${c.label}: ${c.before} -> ${c.after}`),
    "Salvar configuração não executa ações externas.",
  ]);
}
export function StatusMessage(
  kind: "success" | "warning" | "danger" | "info",
  message: string,
  next = "",
): View {
  return view([
    `${{ success: "Concluído", warning: "Atenção", danger: "Erro", info: "Informação" }[kind]}: ${message}`,
    ...(next ? [next] : []),
  ]);
}
export function Progress(
  label: string,
  state: string,
  completed?: number,
  total?: number,
  cancellable = false,
): View {
  const percent =
    total !== undefined && total > 0 && completed !== undefined
      ? ` ${Math.round(Math.min(100, Math.max(0, (completed / total) * 100)))}% (${completed}/${total})`
      : "";
  return view([
    `${label}: ${state}${percent}`,
    ...(cancellable ? ["[Cancelar operação]"] : []),
  ]);
}
export function TaskList(
  tasks: readonly { label: string; state: string }[],
): View {
  return view(tasks.map((t) => `${t.label}: ${t.state}`));
}
export function DetailView(
  label: string,
  fields: Readonly<Record<string, unknown>>,
): View {
  return view([label, ...Object.entries(fields).map(([k, v]) => `${k}: ${v}`)]);
}
export function ResultList(
  items: readonly Choice[],
  focusedId: string,
  detail: View,
  columns = 80,
): View {
  const list = items.map((i) => `${i.id === focusedId ? ">" : " "} ${i.label}`);
  if (columns < 120)
    return view(
      [...list, "", ...detail.lines],
      Math.max(
        0,
        items.findIndex((i) => i.id === focusedId),
      ),
    );
  const left = Math.floor(columns / 3);
  return view(
    Array.from(
      { length: Math.max(list.length, detail.lines.length) },
      (_, i) =>
        truncate(list[i] ?? "", left - 2) +
        " ".repeat(
          Math.max(0, left - cellWidth(truncate(list[i] ?? "", left - 2))),
        ) +
        (detail.lines[i] ?? ""),
    ),
  );
}
export interface Column {
  id: string;
  label: string;
  priority: number;
}
export class TableModel {
  sort: { id: string; direction: "asc" | "desc" } | undefined;
  readonly columns: readonly Column[];
  readonly records: readonly Record<string, string>[];
  constructor(
    columns: readonly Column[],
    records: readonly Record<string, string>[],
  ) {
    this.columns = columns;
    this.records = records;
  }
  order(id: string) {
    if (!this.columns.some((c) => c.id === id))
      throw new Error("Coluna desconhecida");
    this.sort = {
      id,
      direction:
        this.sort?.id === id && this.sort.direction === "asc" ? "desc" : "asc",
    };
  }
  get rows() {
    const sort = this.sort;
    return sort
      ? [...this.records].sort(
          (a, b) =>
            (a[sort.id] ?? "").localeCompare(b[sort.id] ?? "", undefined, {
              numeric: true,
            }) * (sort.direction === "asc" ? 1 : -1),
        )
      : [...this.records];
  }
}
export function DataTable(
  table: TableModel,
  columns = 80,
  linear = false,
): View {
  const sort = table.sort
    ? `Ordenado por ${table.columns.find((c) => c.id === table.sort!.id)?.label}: ${table.sort.direction}`
    : "Ordem original";
  if (linear || columns < 60)
    return view([
      sort,
      ...table.rows.flatMap((r, i) => [
        `Registro ${i + 1}`,
        ...table.columns.map((c) => `${c.label}: ${r[c.id] ?? ""}`),
        "",
      ]),
    ]);
  const visible = [...table.columns]
    .sort((a, b) => a.priority - b.priority)
    .slice(0, Math.max(1, Math.floor(columns / 20)));
  const width = Math.max(1, Math.floor(columns / visible.length) - 2);
  const row = (values: string[]) =>
    values
      .map((v) => {
        const t = truncate(v, width);
        return t + " ".repeat(Math.max(0, width - cellWidth(t)));
      })
      .join("  ");
  return view([
    sort,
    row(visible.map((c) => c.label)),
    ...table.rows.map((r) => row(visible.map((c) => r[c.id] ?? ""))),
    ...(visible.length < table.columns.length
      ? ["Mais colunas disponíveis no detalhe e no modo linear."]
      : []),
  ]);
}
export class LogModel {
  private history: string[] = [];
  private frozen: string[] = [];
  paused = false;
  dropped = 0;
  readonly limit: number;
  constructor(limit = 500) {
    this.limit = limit;
    if (!Number.isInteger(limit) || limit < 1)
      throw new Error("Limite de histórico inválido");
  }
  append(message: string) {
    for (const line of message.split(/\r?\n/)) {
      this.history.push(safeText(line));
      if (this.history.length > this.limit) {
        this.history.shift();
        this.dropped++;
      }
    }
  }
  toggle() {
    this.paused = !this.paused;
    if (this.paused) this.frozen = [...this.history];
  }
  get lines() {
    return [...(this.paused ? this.frozen : this.history)];
  }
  export() {
    return this.history.join("\n");
  }
}
export function LogView(log: LogModel): View {
  return view([
    `Logs: ${log.paused ? "pausado" : "acompanhando"} [${log.paused ? "Retomar" : "Pausar"}]`,
    ...log.lines,
    `${log.dropped} linhas antigas removidas · [Exportar texto]`,
  ]);
}
export function EmptyState(
  kind: "empty" | "filtered" | "unavailable",
  next: string,
): View {
  return view([
    {
      empty: "Nenhum dado disponível.",
      filtered: "Nenhum resultado para o filtro.",
      unavailable: "Dependência indisponível.",
    }[kind],
    next,
  ]);
}
export function ErrorState(message: string, next: string): View {
  return view([`Erro: ${message}`, next]);
}
export function HelpView(mode: string, bindings: readonly Binding[]): View {
  return view([
    `Ajuda — modo ${mode}`,
    ...bindings.map((b) => `${b.label}: ${b.action}`),
    "Salvar é uma ação visível mesmo sem atalho. Esc volta; alterações pendentes exigem decisão.",
  ]);
}
export interface PanelOptions {
  title: string;
  scope: string;
  dirty: boolean;
  body: View;
  help: string;
  feedback: string;
  actions: View;
  hints: View;
  columns: number;
  rows: number;
  density?: "focus" | "calm";
  ascii?: boolean;
}
/** Cell-layout projection. Full text stays available separately; focused content is never scrolled away. */
export function TerminalPanel(p: PanelOptions): View {
  const width = Math.max(1, Math.floor(p.columns)),
    height = Math.max(1, Math.floor(p.rows));
  const split = (lines: string[]) => lines.flatMap((line) => wrap(line, width));
  const fullHeader = split([
    p.title,
    `${p.scope} · ${p.dirty ? "Alterações não salvas" : "Sem alterações"}`,
  ]);
  const header = [
    truncate(p.title, width, p.ascii ? "..." : "…"),
    truncate(
      `${p.scope} ${p.ascii ? "|" : "·"} ${p.dirty ? "Alterações não salvas" : "Sem alterações"}`,
      width,
      p.ascii ? "..." : "…",
    ),
  ];
  const footer = split([...p.actions.lines, ...p.hints.lines]);
  const fullFeedback = split([p.feedback || p.help]);
  const feedback =
    fullFeedback.length > 2
      ? [fullFeedback[0]!, "Mensagem completa disponível em Ajuda."]
      : fullFeedback;
  const body = split(p.body.lines),
    beforeFocus = split(p.body.lines.slice(0, p.body.focusedLine)).length;
  const gap = p.density === "calm" && height > 18 ? [""] : [];
  if (width < 40 || height < 12)
    return view(
      split([
        p.title,
        "Use o modo linear.",
        "O rascunho foi preservado.",
        "[Modo linear] [Voltar]",
      ]).slice(0, height),
    );
  const available = Math.max(
    1,
    height -
      header.length -
      footer.length -
      feedback.length -
      gap.length * 2 -
      1,
  );
  const start = Math.max(
    0,
    Math.min(
      beforeFocus - Math.floor(Math.max(0, available - 2) / 2),
      body.length - available,
    ),
  );
  const lines = [
    ...header,
    ...gap,
    ...body.slice(start, start + available),
    `${Math.min(start + 1, body.length)}-${Math.min(start + available, body.length)} de ${body.length} linhas`,
    ...gap,
    ...feedback,
    ...footer,
  ];
  const fullText = [...fullHeader, ...body, ...fullFeedback, ...footer];
  const result = {
    lines: lines.slice(0, height),
    fullText,
    focusedLine: header.length + gap.length + beforeFocus - start,
  };
  return result;
}
