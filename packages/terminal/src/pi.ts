import {
  Input,
  matchesKey,
  type Component,
  type KeybindingsManager,
  type Keybinding,
  type KeyId,
} from "@earendil-works/pi-tui";
import type { Binding, ActionId, TerminalResult, Values } from "./contracts.ts";
import { resolveBindings, keyAction, keyHints } from "./keyboard.ts";
import {
  PanelController,
  type PanelControllerOptions,
  type PanelTask,
} from "./controller.ts";
import { safeText } from "./text.ts";
import { WorkspaceModel } from "./workspace.ts";
export interface PiTheme {
  fg(
    name: "accent" | "muted" | "error" | "success" | "warning",
    text: string,
  ): string;
}
export interface PiRuntime {
  requestRender(): void;
  terminal?: { rows: number };
}
export interface PiUI {
  custom<T>(
    factory: (
      tui: PiRuntime,
      theme: PiTheme,
      keys: KeybindingsManager,
      done: (value: T) => void,
    ) => Component & { focused?: boolean },
    options?: {
      overlay: boolean;
      overlayOptions: {
        width: `${number}%`;
        maxHeight: `${number}%`;
        anchor: "center";
      };
    },
  ): Promise<T>;
}
const HOST_ACTIONS: [ActionId, Keybinding][] = [
  ["navigate.up", "tui.select.up"],
  ["navigate.down", "tui.select.down"],
  ["activate", "tui.select.confirm"],
  ["back", "tui.select.cancel"],
  ["navigate.pageUp", "tui.select.pageUp"],
  ["navigate.pageDown", "tui.select.pageDown"],
];
export function piBindings(
  keys: KeybindingsManager,
  reserved: readonly string[] = [],
  ctrlS = true,
): Binding[] {
  const host: Binding[] = HOST_ACTIONS.flatMap(([action, id]) =>
    keys.getKeys(id).map((key) => ({
      action,
      key,
      label: key,
      scope: action.startsWith("navigate.")
        ? ("navigation" as const)
        : ("panel" as const),
    })),
  );
  return resolveBindings(host, reserved, ctrlS);
}
/** A temporary host component: no writes to process streams, no editor/footer replacement. */
export class PiSettingsPanel implements Component {
  focused = true;
  readonly controller: PanelController;
  private input: Input | undefined;
  private editingId: string | undefined;
  private disposed = false;
  private pasting = false;
  private pending = new Set<Promise<void>>();
  readonly theme: PiTheme;
  readonly requestRender: () => void;
  readonly done: () => void;
  readonly rows: () => number;
  readonly reserved: readonly string[];
  constructor(
    options: PanelControllerOptions,
    theme: PiTheme,
    requestRender: () => void,
    done: () => void,
    rows: () => number,
    task?: PanelTask,
    reserved: readonly string[] = [],
  ) {
    this.theme = theme;
    this.requestRender = requestRender;
    this.done = done;
    this.rows = rows;
    this.reserved = reserved;
    this.controller = new PanelController(
      {
        ...options,
        onChange: () => {
          if (!this.disposed) this.requestRender();
        },
      },
      task,
    );
  }
  invalidate() {}
  private syncInput() {
    if (this.controller.searchEditing) {
      if (this.editingId !== "@search") {
        this.input = new Input();
        this.input.setValue(this.controller.search);
        this.editingId = "@search";
      }
      return;
    }
    const f = this.controller.field;
    if (
      f &&
      ["text", "number", "secret"].includes(f.kind) &&
      this.editingId !== f.id
    ) {
      this.input = new Input();
      this.input.focused = true;
      this.input.setValue(
        f.kind === "secret"
          ? ""
          : String(this.controller.session.editing?.value ?? ""),
      );
      this.editingId = f.id;
    }
    if (!f) {
      this.input = undefined;
      this.editingId = undefined;
    }
  }
  private execute(action: ActionId) {
    if (
      this.input &&
      !this.controller.help &&
      (action === "save" || action === "activate")
    )
      this.controller.setText(this.input.getValue());
    const pending = this.controller
      .dispatch(action)
      .then(() => {
        if (this.disposed) return;
        this.syncInput();
        this.requestRender();
        if (this.controller.session.closed) {
          this.dispose();
          this.done();
        }
      })
      .catch(() => {
        if (!this.disposed) {
          this.controller.session.status =
            "Ação falhou. O rascunho foi preservado.";
          this.requestRender();
        }
      })
      .finally(() => this.pending.delete(pending));
    this.pending.add(pending);
    this.requestRender();
  }
  handleInput(data: string) {
    if (
      this.disposed ||
      this.reserved.some((key) => matchesKey(data, key as KeyId))
    )
      return;
    this.syncInput();
    // Native Input owns complete/fragmented bracketed paste. Never dispatch pasted characters.
    if (this.pasting || data.includes("\x1b[200~")) {
      this.pasting = !data.includes("\x1b[201~");
      this.input?.handleInput(data);
      this.requestRender();
      return;
    }
    if (this.controller.searchEditing && this.input) {
      const binding = this.controller.options.bindings.find((b) =>
        matchesKey(data, b.key as KeyId),
      );
      const action =
        binding &&
        keyAction(binding.key, this.controller.options.bindings, "field");
      if (action === "back" || action === "activate") {
        if (action === "activate")
          this.controller.filter(this.input.getValue());
        this.controller.searchEditing = false;
        this.input = undefined;
        this.editingId = undefined;
      } else this.input.handleInput(data);
      this.requestRender();
      return;
    }
    const context = this.controller.help
      ? "navigation"
      : this.input
        ? "field"
        : this.controller.operation.active
          ? "operation"
          : "navigation";
    const binding = this.controller.options.bindings.find((b) =>
      matchesKey(data, b.key as KeyId),
    );
    const action = binding
      ? keyAction(binding.key, this.controller.options.bindings, context)
      : undefined;
    if (action) this.execute(action);
    else if (this.input) {
      this.input.handleInput(data);
      this.requestRender();
    }
  }
  render(columns: number): string[] {
    this.syncInput();
    const frame = this.controller.render(columns, this.rows());
    if (this.controller.searchEditing && this.input)
      return [
        "Buscar itens (vazio limpa)",
        ...this.input.render(columns),
        keyHints(this.controller.options.bindings, {
          activate: "aplicar",
          back: "voltar",
        }),
      ];
    if (
      this.input &&
      this.controller.field &&
      !this.controller.session.closeDecision &&
      !this.controller.help
    ) {
      const secret = this.controller.field.kind === "secret";
      const editLines = secret
        ? ["[entrada protegida]"]
        : this.input.render(Math.max(1, columns));
      const label = safeText(this.controller.field.label);
      const labelIndex = frame.lines.findIndex((l) => l === label);
      if (labelIndex >= 0) frame.lines.splice(labelIndex + 1, 1, ...editLines);
    }
    return frame.lines
      .map((line) =>
        line.startsWith(">")
          ? this.theme.fg("accent", line)
          : line.startsWith("Erro:")
            ? this.theme.fg("error", line)
            : line,
      )
      .slice(0, this.rows());
  }
  async drain() {
    await Promise.all([...this.pending]);
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.input?.setValue("");
    this.input = undefined;
    this.controller.dispose();
  }
}
export async function openPiSettings(
  ui: PiUI,
  options: Omit<PanelControllerOptions, "bindings"> & {
    signal: AbortSignal;
    reservedKeys?: string[];
    ctrlS?: boolean;
    task?: PanelTask;
  },
): Promise<TerminalResult<Values>> {
  if (options.signal.aborted)
    return { status: "cancelled", message: "Sessão encerrada." };
  let component: PiSettingsPanel | undefined;
  try {
    await ui.custom<void>(
      (tui, theme, keys, done) => {
        const abort = () => {
          component?.dispose();
          done();
        };
        component = new PiSettingsPanel(
          {
            ...options,
            bindings: piBindings(
              keys,
              options.reservedKeys,
              options.ctrlS ?? true,
            ),
          },
          theme,
          () => tui.requestRender(),
          () => {
            options.signal.removeEventListener("abort", abort);
            done();
          },
          () => Math.max(1, tui.terminal?.rows ?? 24),
          options.task,
          options.reservedKeys,
        );
        options.signal.addEventListener("abort", abort, { once: true });
        const dispose = component.dispose.bind(component);
        component.dispose = () => {
          options.signal.removeEventListener("abort", abort);
          dispose();
        };
        return component;
      },
      {
        overlay: true,
        overlayOptions: { width: "100%", maxHeight: "100%", anchor: "center" },
      },
    );
    return options.signal.aborted
      ? { status: "cancelled", message: "Sessão encerrada." }
      : { status: "succeeded", value: options.session.persisted };
  } catch {
    return {
      status: "failed",
      message: "Não foi possível abrir o painel. Verifique a API do host.",
    };
  } finally {
    component?.dispose();
  }
}

export async function openPiWorkspace(
  ui: PiUI,
  model: WorkspaceModel,
  signal: AbortSignal,
  reservedKeys: string[] = ["ctrl+c"],
): Promise<void> {
  if (signal.aborted) return;
  let dispose: (() => void) | undefined;
  try {
    await ui.custom<void>(
      (tui, theme, keys, done) => {
        let closed = false;
        const bindings = piBindings(keys, reservedKeys, false);
        const close = () => {
          if (closed) return;
          closed = true;
          signal.removeEventListener("abort", close);
          done();
        };
        signal.addEventListener("abort", close, { once: true });
        dispose = close;
        return {
          focused: true,
          invalidate() {},
          dispose: close,
          render(columns) {
            return model
              .render(columns, Math.max(1, tui.terminal?.rows ?? 24))
              .lines.map((l) =>
                l.startsWith(">") ? theme.fg("accent", l) : l,
              );
          },
          handleInput(data) {
            if (
              closed ||
              reservedKeys.some((key) => matchesKey(data, key as KeyId))
            )
              return;
            const binding = bindings.find((b) =>
              matchesKey(data, b.key as KeyId),
            );
            const action =
              binding && keyAction(binding.key, bindings, "navigation");
            if (action) model.dispatch(action);
            if (model.closed) close();
            else tui.requestRender();
          },
        };
      },
      {
        overlay: true,
        overlayOptions: { width: "100%", maxHeight: "100%", anchor: "center" },
      },
    );
  } finally {
    dispose?.();
  }
}
