import type { ActionId, Choice } from "./contracts.ts";
import { Navigation } from "./navigation.ts";
import {
  DataTable,
  DetailView,
  LogModel,
  LogView,
  ResultList,
  TableModel,
  TerminalPanel,
  ActionBar,
  type Column,
  type View,
} from "./components.ts";
export interface WorkspaceRecord extends Choice {
  fields: Record<string, string>;
}
/** Persistent data exploration policy; host/renderer exclusively owns buffers and stream cleanup. */
export class WorkspaceModel {
  readonly navigation: Navigation;
  readonly table: TableModel;
  readonly log: LogModel;
  mode: "results" | "table" | "logs" = "results";
  region: "content" | "actions" = "content";
  scroll = 0;
  closed = false;
  constructor(readonlyOptions: {
    records: readonly WorkspaceRecord[];
    columns: readonly Column[];
    logLimit?: number;
  }) {
    this.records = readonlyOptions.records;
    this.navigation = new Navigation("workspace", this.records);
    this.table = new TableModel(
      readonlyOptions.columns,
      this.records.map((r) => r.fields),
    );
    this.log = new LogModel(readonlyOptions.logLimit);
  }
  readonly records: readonly WorkspaceRecord[];
  actionIndex = 0;
  get actions() {
    return [
      "Resultados",
      "Tabela",
      "Logs",
      "Ordenar",
      this.log.paused ? "Retomar logs" : "Pausar logs",
      "Fechar",
    ];
  }
  dispatch(action: ActionId) {
    if (action === "back" || action === "close") {
      this.closed = true;
      return;
    }
    if (action === "nextRegion" || action === "previousRegion") {
      this.region = this.region === "content" ? "actions" : "content";
      return;
    }
    if (this.region === "actions") {
      if (action === "navigate.up")
        this.actionIndex = Math.max(0, this.actionIndex - 1);
      if (action === "navigate.down")
        this.actionIndex = Math.min(
          this.actions.length - 1,
          this.actionIndex + 1,
        );
      if (action === "activate") {
        if (this.actionIndex < 3) {
          this.mode = (["results", "table", "logs"] as const)[
            this.actionIndex
          ]!;
          this.scroll = 0;
        }
        if (this.actionIndex === 3 && this.table.columns[0])
          this.table.order(this.table.columns[0].id);
        if (this.actionIndex === 4) this.log.toggle();
        if (this.actionIndex === 5) this.closed = true;
      }
      return;
    }
    const delta =
      action === "navigate.down"
        ? 1
        : action === "navigate.up"
          ? -1
          : action === "navigate.pageDown"
            ? 5
            : action === "navigate.pageUp"
              ? -5
              : 0;
    if (this.mode === "results") this.navigation.move(delta);
    else this.scroll = Math.max(0, this.scroll + delta);
    if (action === "navigate.first") {
      this.navigation.first();
      this.scroll = 0;
    }
    if (action === "navigate.last") {
      this.navigation.last();
      this.scroll = Math.max(0, this.linear().lines.length - 1);
    }
  }
  linear(): View {
    if (this.mode === "logs") return LogView(this.log);
    if (this.mode === "table") return DataTable(this.table, 40, true);
    const lines = this.navigation.visible.flatMap(
      (r) =>
        DetailView(
          r.label,
          this.records.find((v) => v.id === r.id)?.fields ?? {},
        ).lines,
    );
    return { lines, fullText: lines, focusedLine: 0 };
  }
  render(columns: number, rows: number): View {
    const current = this.records.find(
      (r) => r.id === this.navigation.current.focusedId,
    );
    const body =
      this.mode === "results"
        ? ResultList(
            this.navigation.visible,
            current?.id ?? "",
            DetailView(
              current?.label ?? "Nenhum resultado",
              current?.fields ?? {},
            ),
            columns,
          )
        : this.mode === "table"
          ? DataTable(this.table, columns)
          : LogView(this.log);
    if (this.mode !== "results")
      body.focusedLine = Math.min(
        Math.max(0, body.lines.length - 1),
        this.scroll,
      );
    return TerminalPanel({
      title: "Diagnóstico / Workspace",
      scope: "projeto atual",
      dirty: false,
      body,
      help: "Tab alterna conteúdo e ações. Setas navegam. Enter ativa. Esc fecha.",
      feedback: "",
      actions: ActionBar(
        this.actions.map((label, i) => ({ id: String(i), label })),
        this.region === "actions" ? String(this.actionIndex) : undefined,
      ),
      hints: {
        lines: ["Tab ações · Enter abrir · Esc voltar"],
        fullText: [],
        focusedLine: 0,
      },
      columns,
      rows,
    });
  }
}
