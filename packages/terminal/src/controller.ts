import type { ActionId, Binding, Choice, Field } from "./contracts.ts";
import { SettingsSession, type Persist } from "./settings.ts";
import { Navigation } from "./navigation.ts";
import { Operation } from "./operation.ts";
import {
  ActionBar,
  HelpView,
  KeyHints,
  Select,
  SettingsList,
  TerminalPanel,
  TextInput,
  SecretInput,
  MultiSelect,
  type View,
} from "./components.ts";
export interface PanelControllerOptions {
  title: string;
  scope: string;
  session: SettingsSession;
  persist: Persist;
  bindings: readonly Binding[];
  onChange?: () => void;
}
// Operation callback intentionally receives a snapshot, never a mutable session.
export interface PanelTask {
  label: string;
  timeoutMs: number;
  effect: "local" | "external";
  run: (
    draft: Readonly<import("./contracts.ts").Values>,
    signal: AbortSignal,
    report: (label: string, completed?: number, total?: number) => void,
  ) => Promise<unknown>;
}
export class PanelController {
  readonly navigation: Navigation;
  readonly operation: Operation<unknown>;
  region: "fields" | "actions" = "fields";
  actionIndex = 0;
  modalIndex = 0;
  choiceIndex = 0;
  help = false;
  searchEditing = false;
  search = "";
  helpOffset = 0;
  private selected: string[] = [];
  readonly options: PanelControllerOptions;
  readonly task: PanelTask | undefined;
  constructor(options: PanelControllerOptions, task?: PanelTask) {
    this.options = options;
    this.task = task;
    this.navigation = new Navigation(
      "settings",
      options.session.fields,
      options.session.focusedId,
    );
    this.operation = new Operation(options.scope, task?.effect ?? "local");
  }
  get session() {
    return this.options.session;
  }
  get field(): Field | undefined {
    return this.session.fields.find((f) => f.id === this.session.editing?.id);
  }
  get choices(): readonly Choice[] {
    return this.field?.choices ?? [];
  }
  get actions() {
    return [
      { id: "save", label: "Salvar alterações" },
      ...(this.task
        ? [
            {
              id: "run",
              label: this.operation.active
                ? "Cancelar operação"
                : this.task.label,
            },
          ]
        : []),
      { id: "help", label: "Ajuda" },
      { id: "close", label: "Fechar" },
    ];
  }
  get selectedChoices() {
    return [...this.selected];
  }
  begin(id: string) {
    this.session.begin(id);
    const value = this.session.editing?.value;
    this.choiceIndex = Math.max(
      0,
      this.choices.findIndex((c) => c.id === value),
    );
    this.selected = Array.isArray(value) ? [...value] : [];
  }
  setText(text: string) {
    if (this.field)
      this.session.edit(
        this.field.kind === "number"
          ? text.trim() === ""
            ? NaN
            : Number(text)
          : text,
      );
  }
  private move(delta: number) {
    if (this.session.closeDecision)
      this.modalIndex = Math.max(0, Math.min(2, this.modalIndex + delta));
    else if (this.session.editing)
      this.choiceIndex = Math.max(
        0,
        Math.min(this.choices.length - 1, this.choiceIndex + delta),
      );
    else if (this.region === "actions")
      this.actionIndex = Math.max(
        0,
        Math.min(this.actions.length - 1, this.actionIndex + delta),
      );
    else {
      this.navigation.move(delta);
      this.session.focusedId = this.navigation.current.focusedId;
    }
  }
  async dispatch(action: ActionId) {
    if (this.session.closed) return;
    if (this.help) {
      if (action === "navigate.down" || action === "navigate.pageDown")
        this.helpOffset = Math.min(
          this.options.bindings.length,
          this.helpOffset + (action === "navigate.pageDown" ? 5 : 1),
        );
      if (action === "navigate.up" || action === "navigate.pageUp")
        this.helpOffset = Math.max(
          0,
          this.helpOffset - (action === "navigate.pageUp" ? 5 : 1),
        );
      if (["back", "help", "close", "activate"].includes(action))
        this.help = false;
      return;
    }
    if (this.session.closeDecision) {
      if (action === "back") this.session.back();
      else if (action === "navigate.up") this.move(-1);
      else if (action === "navigate.down") this.move(1);
      else if (action === "activate")
        await this.session.decide(
          (["continue", "saveClose", "discard"] as const)[this.modalIndex]!,
          this.options.persist,
        );
      return;
    }
    if (action === "help") {
      this.help = true;
      return;
    }
    if (
      action === "search" &&
      this.navigation.searchable &&
      !this.session.editing &&
      !this.operation.active
    ) {
      this.searchEditing = true;
      return;
    }
    if (
      action === "cancelOperation" ||
      (this.operation.active && action === "back")
    ) {
      this.operation.cancel();
      return;
    }
    if (this.operation.active) return;
    if (action === "save") {
      const f = this.field;
      if (f?.kind === "select") {
        const c = this.choices[this.choiceIndex];
        if (!c || c.disabled) return;
        this.session.edit(c.id);
      }
      if (f?.kind === "multiselect") this.session.edit(this.selected);
      await this.session.save(this.options.persist);
      return;
    }
    if (action === "back" || action === "close") {
      this.session.back();
      this.modalIndex = 0;
      return;
    }
    if (action === "nextRegion" || action === "previousRegion") {
      if (!this.session.editing)
        this.region = this.region === "fields" ? "actions" : "fields";
      return;
    }
    if (action === "navigate.up") this.move(-1);
    if (action === "navigate.down") this.move(1);
    if (!this.session.editing && this.region === "fields") {
      if (action === "navigate.first") this.navigation.first();
      if (action === "navigate.last") this.navigation.last();
      if (action === "navigate.pageUp") this.navigation.move(-1, 5);
      if (action === "navigate.pageDown") this.navigation.move(1, 5);
      this.session.focusedId = this.navigation.current.focusedId;
    }
    if (action === "toggle" && this.field?.kind === "multiselect") {
      const c = this.choices[this.choiceIndex];
      if (c && !c.disabled)
        this.selected = this.selected.includes(c.id)
          ? this.selected.filter((id) => id !== c.id)
          : [...this.selected, c.id];
    }
    if (action !== "activate") return;
    if (this.session.editing) {
      const f = this.field!;
      if (f.kind === "select") {
        const c = this.choices[this.choiceIndex];
        if (!c || c.disabled) return;
        this.session.edit(c.id);
      }
      if (f.kind === "multiselect") this.session.edit(this.selected);
      if (f.kind === "boolean") this.session.edit(!this.session.editing.value);
      this.session.confirmEdit();
      return;
    }
    if (this.region === "fields") {
      this.begin(this.session.focusedId);
      return;
    }
    const id = this.actions[this.actionIndex]?.id;
    if (id === "save") await this.session.save(this.options.persist);
    if (id === "help") this.help = true;
    if (id === "close") this.session.back();
    if (id === "run" && this.task) {
      const draft = this.session.draft;
      await this.operation.run(
        (signal, report) =>
          this.task!.run(draft, signal, (label, completed, total) => {
            report(label, completed, total);
            this.options.onChange?.();
          }),
        this.task.timeoutMs,
      );
    }
  }
  filter(value: string) {
    this.search = value;
    this.navigation.filter(value);
    this.session.focusedId = this.navigation.current.focusedId;
  }
  render(columns: number, rows: number, ascii = false): View {
    let body: View;
    const editing = this.session.editing,
      f = this.field;
    if (this.help) {
      body = HelpView("painel", this.options.bindings);
      body.lines.push(
        this.session.status,
        this.operation.message,
        this.session.fields.find((f) => f.id === this.session.focusedId)
          ?.description ?? "",
      );
      body.focusedLine = this.helpOffset;
    } else if (this.session.closeDecision)
      body = {
        lines: [
          "Há alterações não salvas.",
          ...[
            "Continuar editando",
            "Salvar e fechar",
            "Descartar alterações",
          ].map((s, i) => `${i === this.modalIndex ? ">" : " "} [${s}]`),
        ],
        focusedLine: 1 + this.modalIndex,
        fullText: [],
      };
    else if (editing && f) {
      if (f.kind === "secret")
        body = SecretInput(f.label, this.session.errors[f.id]);
      else if (f.kind === "select")
        body = Select(
          f.label,
          this.choices,
          this.choices[this.choiceIndex]?.id ?? "",
          String(editing.value),
        );
      else if (f.kind === "multiselect")
        body = MultiSelect(
          f.label,
          this.choices,
          this.choices[this.choiceIndex]?.id ?? "",
          this.selected,
        );
      else
        body = TextInput(
          f.label,
          String(editing.value),
          this.session.errors[f.id],
        );
    } else {
      const list = SettingsList(this.session, columns);
      const ids = new Set(this.navigation.visible.map((f) => f.id));
      if (this.search) {
        const visible = this.session.fields.filter((f) => ids.has(f.id));
        const lines = visible.flatMap((f) => {
          const projected = new SettingsSession([f], {
            [f.id]: this.session.effective[f.id]!,
          });
          projected.focusedId = this.session.focusedId;
          return SettingsList(projected, columns).lines;
        });
        body = {
          lines: lines.length ? lines : ["Nenhum resultado. Limpe a busca."],
          focusedLine:
            Math.max(
              0,
              this.navigation.visible.findIndex(
                (f) => f.id === this.session.focusedId,
              ),
            ) * (columns < 60 ? 2 : 1),
          fullText: lines,
        };
      } else body = list;
      if (this.navigation.searchable)
        body = {
          ...body,
          lines: [`[Buscar itens] ${this.search}`, ...body.lines],
          focusedLine: body.focusedLine + 1,
        };
    }
    return TerminalPanel({
      title: this.options.title,
      scope: this.options.scope,
      dirty: this.session.dirty,
      body,
      help:
        this.session.fields.find((f) => f.id === this.session.focusedId)
          ?.description ?? "",
      feedback: this.operation.active
        ? `${this.operation.progress.label} ${ascii ? "|" : "·"} ${this.operation.state}`
        : this.session.status || this.operation.message,
      actions: ActionBar(
        this.actions,
        this.region === "actions"
          ? this.actions[this.actionIndex]?.id
          : undefined,
      ),
      hints: KeyHints(
        this.options.bindings,
        {
          activate: editing ? "concluir campo" : "editar/abrir",
          nextRegion: "ações",
          back: this.operation.active ? "cancelar operação" : "voltar",
          save: "salvar",
          ...(this.navigation.searchable ? { search: "buscar" } : {}),
        },
        ascii,
      ),
      columns,
      rows,
      ascii,
    });
  }
  dispose() {
    this.operation.dispose();
    this.session.dispose();
  }
}
