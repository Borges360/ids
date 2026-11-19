import type { Field, Value, Values, TerminalResult } from "./contracts.ts";
const clone = <T>(value: T): T => structuredClone(value);
const same = (a: Value | undefined, b: Value | undefined) =>
  JSON.stringify(a) === JSON.stringify(b);
export type Persist = (
  values: Readonly<Values>,
  signal: AbortSignal,
) => Promise<void>;
export interface SaveOptions {
  signal?: AbortSignal | undefined;
  timeoutMs?: number;
}
export class PersistenceOutcomeUnknown extends Error {}
/** Snapshot ownership prevents consumers from mutating persisted state through shared references. */
export class SettingsSession {
  private stored: Values;
  private working: Values;
  private editor: { id: string; value: Value } | undefined;
  private controller: AbortController | undefined;
  private generation = 0;
  private disposed = false;
  private persistenceUnknown = false;
  errors: Record<string, string> = {};
  focusedId: string;
  status = "";
  closeDecision = false;
  closed = false;
  readonly fields: readonly Field[];
  constructor(fields: readonly Field[], initial: Values) {
    this.fields = fields;
    if (new Set(fields.map((f) => f.id)).size !== fields.length)
      throw new Error("IDs de campos duplicados");
    for (const f of fields)
      if (!(f.id in initial)) throw new Error(`Valor ausente: ${f.id}`);
    this.stored = clone(initial);
    this.working = clone(initial);
    this.focusedId = fields[0]?.id ?? "";
  }
  get persisted() {
    return clone(this.stored);
  }
  get draft() {
    return clone(this.working);
  }
  get effective(): Values {
    return Object.fromEntries(
      this.fields.map((f) => [
        f.id,
        clone(f.override?.value ?? this.working[f.id]!),
      ]),
    );
  }
  get editing() {
    return this.editor ? clone(this.editor) : undefined;
  }
  get saving() {
    return !!this.controller;
  }
  get dirty() {
    return Object.keys(this.working).some(
      (k) => !same(this.working[k], this.stored[k]),
    );
  }
  get changes() {
    return this.fields
      .filter((f) => !same(this.working[f.id], this.stored[f.id]))
      .map((f) => ({
        id: f.id,
        label: f.label,
        before: f.kind === "secret" ? "[protegido]" : clone(this.stored[f.id]),
        after: f.kind === "secret" ? "[protegido]" : clone(this.working[f.id]),
      }));
  }
  begin(id: string) {
    if (this.disposed || this.saving) return;
    const f = this.fields.find((f) => f.id === id);
    if (!f) throw new Error("Campo desconhecido");
    this.focusedId = id;
    if (f.override) {
      this.status = `Valor definido por ${f.override.source}. Altere a origem.`;
      return;
    }
    this.editor = { id, value: clone(this.working[id]!) };
  }
  edit(value: Value) {
    if (this.editor && !this.saving && !this.disposed)
      this.editor.value = clone(value);
  }
  private error(field: Field, value: Value): string | undefined {
    const validType =
      field.kind === "number"
        ? typeof value === "number" && Number.isFinite(value)
        : field.kind === "boolean"
          ? typeof value === "boolean"
          : field.kind === "multiselect"
            ? Array.isArray(value) && value.every((v) => typeof v === "string")
            : typeof value === "string";
    if (!validType) return "Informe um valor válido.";
    const values = Array.isArray(value) ? value : [value];
    if (field.kind === "multiselect" && new Set(values).size !== values.length)
      return "Escolha cada opção apenas uma vez.";
    if (
      (field.kind === "select" || field.kind === "multiselect") &&
      values.some((v) => !field.choices?.some((c) => c.id === v && !c.disabled))
    )
      return "Selecione uma opção disponível.";
    try {
      return field.validate?.(clone(value), {
        ...this.draft,
        [field.id]: clone(value),
      });
    } catch {
      return "Não foi possível validar este campo. Verifique a regra do produto.";
    }
  }
  confirmEdit(): boolean {
    if (!this.editor) return true;
    const { id, value } = this.editor,
      field = this.fields.find((f) => f.id === id)!;
    const message = this.error(field, value);
    if (message) {
      this.errors[id] = message;
      this.focusedId = id;
      return false;
    }
    this.working[id] = clone(value);
    delete this.errors[id];
    this.editor = undefined;
    return true;
  }
  abandonEdit() {
    this.editor = undefined;
  }
  validate(): boolean {
    this.errors = {};
    for (const f of this.fields) {
      const error = this.error(f, f.override?.value ?? this.working[f.id]!);
      if (error) this.errors[f.id] = error;
    }
    const first = Object.keys(this.errors)[0];
    if (first) this.focusedId = first;
    return !first;
  }
  async save(
    persist: Persist,
    options: SaveOptions = {},
  ): Promise<TerminalResult<Values>> {
    if (this.disposed || this.saving || this.persistenceUnknown)
      return {
        status: "invalid",
        message: this.persistenceUnknown
          ? "Consulte o armazenamento antes de repetir o salvamento."
          : "Salvamento indisponível.",
      };
    if (options.signal?.aborted)
      return { status: "cancelled", message: "Sessão encerrada." };
    const timeoutMs = options.timeoutMs ?? 15000;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 2147483647)
      return { status: "invalid", message: "Timeout de salvamento inválido." };
    if (!this.confirmEdit() || !this.validate())
      return { status: "invalid", message: "Corrija os campos indicados." };
    const generation = ++this.generation,
      controller = new AbortController();
    this.controller = controller;
    const snapshot = this.draft;
    const abort = () => controller.abort();
    options.signal?.addEventListener("abort", abort, { once: true });
    const timeout = setTimeout(abort, timeoutMs);
    const cancelled = new Promise<never>((_, reject) =>
      controller.signal.addEventListener(
        "abort",
        () => reject(new Error("aborted")),
        { once: true },
      ),
    );
    try {
      await Promise.race([
        persist(clone(snapshot), controller.signal),
        cancelled,
      ]);
      if (
        this.disposed ||
        generation !== this.generation ||
        controller.signal.aborted
      )
        return {
          status: "outcomeUnknown",
          message:
            "Confirmação não recebida. Consulte o armazenamento antes de repetir.",
        };
      this.stored = clone(snapshot);
      this.status = "Alterações salvas.";
      return { status: "succeeded", value: clone(snapshot) };
    } catch (error) {
      const unknown =
        controller.signal.aborted || error instanceof PersistenceOutcomeUnknown;
      const message = unknown
        ? "Confirmação não recebida. Consulte o armazenamento antes de repetir."
        : "Não foi possível salvar. O rascunho foi preservado. Tente novamente.";
      if (!this.disposed && generation === this.generation) {
        this.status = message;
        this.persistenceUnknown = unknown;
      }
      return {
        status: unknown ? "outcomeUnknown" : "failed",
        message,
      };
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener("abort", abort);
      if (generation === this.generation) this.controller = undefined;
    }
  }
  /** The consumer supplies a fresh storage read; this never repeats a write. */
  reconcilePersistence(current: Values) {
    if (this.disposed || this.saving) return;
    const probe = new SettingsSession(this.fields, current);
    if (!probe.validate()) throw new Error("Estado persistido inválido");
    this.stored = clone(current);
    this.persistenceUnknown = false;
    this.status = "Armazenamento conferido. Revise as alterações pendentes.";
  }
  back() {
    if (this.saving) {
      this.status = "Aguarde a confirmação do salvamento.";
      return;
    }
    if (this.editor) {
      this.abandonEdit();
      return;
    }
    if (this.closeDecision) {
      this.closeDecision = false;
      return;
    }
    if (this.dirty) this.closeDecision = true;
    else this.closed = true;
  }
  async decide(
    decision: "continue" | "saveClose" | "discard",
    persist: Persist,
  ) {
    if (!this.closeDecision || this.saving) return;
    if (decision === "continue") this.closeDecision = false;
    if (decision === "discard") {
      this.working = clone(this.stored);
      this.abandonEdit();
      this.closeDecision = false;
      this.closed = true;
    }
    if (
      decision === "saveClose" &&
      (await this.save(persist)).status === "succeeded"
    ) {
      this.closeDecision = false;
      this.closed = true;
    }
  }
  dispose() {
    this.disposed = true;
    this.generation++;
    this.controller?.abort();
    this.controller = undefined;
    this.abandonEdit();
  }
}
