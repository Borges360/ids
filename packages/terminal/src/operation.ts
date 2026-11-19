import type { OperationState, TerminalResult } from "./contracts.ts";
/** A product can report cancellation only after confirming that its work stopped. */
export class OperationCancelled extends Error {}
class UnknownOutcome extends Error {}
export class Operation<T> {
  state: OperationState = "idle";
  message = "";
  progress: { label: string; completed?: number; total?: number } = {
    label: "",
  };
  private controller: AbortController | undefined;
  private generation = 0;
  private disposed = false;
  readonly owner: string;
  readonly effect: "local" | "external";
  constructor(owner: string, effect: "local" | "external" = "local") {
    this.owner = owner;
    this.effect = effect;
  }
  get active() {
    return this.state === "running" || this.state === "cancelling";
  }
  get percent() {
    const { completed, total } = this.progress;
    return total !== undefined && total > 0 && completed !== undefined
      ? Math.max(0, Math.min(100, (completed / total) * 100))
      : undefined;
  }
  cancel() {
    if (this.state === "running") {
      this.state = "cancelling";
      this.message = "Cancelamento solicitado. Aguardando confirmação.";
      this.controller?.abort();
    }
  }
  async run(
    work: (
      signal: AbortSignal,
      report: (label: string, completed?: number, total?: number) => void,
    ) => Promise<T>,
    timeoutMs: number,
  ): Promise<TerminalResult<T>> {
    if (this.disposed || this.active || this.state === "outcomeUnknown")
      return {
        status: "invalid",
        message:
          this.state === "outcomeUnknown"
            ? "Consulte o resultado antes de repetir."
            : "Operação indisponível.",
      };
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0)
      throw new Error("Timeout obrigatório");
    const generation = ++this.generation,
      controller = new AbortController();
    this.controller = controller;
    this.state = "running";
    this.message = "Operação em andamento.";
    this.progress = { label: "Iniciando" };
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let cancellationDeadline: ReturnType<typeof setTimeout> | undefined;
    const abortResult = new Promise<never>((_, reject) => {
      controller.signal.addEventListener(
        "abort",
        () => {
          cancellationDeadline = setTimeout(
            () => reject(new UnknownOutcome()),
            100,
          );
        },
        { once: true },
      );
      timeout = setTimeout(() => {
        if (generation === this.generation) this.cancel();
      }, timeoutMs);
    });
    try {
      const value = await Promise.race([
        work(controller.signal, (label, completed, total) => {
          if (
            this.disposed ||
            generation !== this.generation ||
            controller.signal.aborted
          )
            return;
          this.progress = {
            label,
            ...(completed !== undefined ? { completed } : {}),
            ...(total !== undefined ? { total } : {}),
          };
        }),
        abortResult,
      ]);
      if (this.disposed || generation !== this.generation)
        return { status: "cancelled", message: "Sessão encerrada." };
      this.state = "succeeded";
      this.message = "Operação concluída.";
      return { status: "succeeded", value };
    } catch (error) {
      const confirmed =
        error instanceof OperationCancelled ||
        (this.effect === "local" && (error as Error)?.name === "AbortError");
      const state = confirmed
        ? "cancelled"
        : error instanceof UnknownOutcome ||
            this.effect === "external" ||
            controller.signal.aborted
          ? "outcomeUnknown"
          : "failed";
      const message =
        state === "outcomeUnknown"
          ? "Confirmação não recebida. Consulte o destino antes de repetir."
          : state === "cancelled"
            ? "Operação cancelada."
            : "Operação falhou. Consulte o diagnóstico e tente novamente.";
      if (!this.disposed && generation === this.generation) {
        this.state = state;
        this.message = message;
      }
      return { status: state, message };
    } finally {
      clearTimeout(timeout);
      clearTimeout(cancellationDeadline);
      if (generation === this.generation) this.controller = undefined;
    }
  }
  reconcile(state: "succeeded" | "failed" | "cancelled", message: string) {
    if (this.state !== "outcomeUnknown")
      throw new Error("Não há resultado pendente");
    this.state = state;
    this.message = message;
  }
  dispose() {
    this.disposed = true;
    this.generation++;
    this.controller?.abort();
    this.controller = undefined;
  }
}
