import {
  input as nativeInput,
  password as nativePassword,
  select as nativeSelect,
  checkbox as nativeCheckbox,
  confirm as nativeConfirm,
} from "@inquirer/prompts";
import type { Readable, Writable } from "node:stream";
import { SettingsSession, type Persist } from "./settings.ts";
import type { Capabilities, TerminalResult, Values } from "./contracts.ts";
import { safeText } from "./text.ts";
import { Operation } from "./operation.ts";
import type { PanelTask } from "./controller.ts";
export interface PromptOptions {
  title: string;
  scope: string;
  session: SettingsSession;
  persist: Persist;
  capabilities: Capabilities;
  input: Readable;
  output: Writable;
  signal?: AbortSignal;
  task?: PanelTask;
}
class PanelBack extends Error {}
/** Native Inquirer prompts own their streams and cleanup; no raw/ANSI renderer in the core. */
export async function runPrompts(
  o: PromptOptions,
): Promise<TerminalResult<Values>> {
  if (!o.capabilities.interactive || o.capabilities.mode === "json")
    return {
      status: "invalid",
      message:
        "Interface requer TTY. Informe argumentos ou use --json/--no-input.",
    };
  const context = {
    input: o.input,
    output: o.output,
    ...(o.signal ? { signal: o.signal } : {}),
  };
  const plain = (text: string) => text;
  const style = o.capabilities.color
    ? {}
    : {
        answer: plain,
        message: plain,
        error: plain,
        defaultAnswer: plain,
        help: plain,
        highlight: plain,
        key: plain,
        description: plain,
        disabled: plain,
        disabledChoice: plain,
      };
  const baseTheme = {
    prefix: { idle: "?", done: "OK" },
    spinner: { frames: ["..."], interval: 1000 },
    style,
  };
  const keysHelpTip = (keys: [string, string][]) =>
    keys
      .map(
        ([key, action]) =>
          `${o.capabilities.unicode ? key : key.replaceAll("↑↓", "Cima/baixo").replaceAll("⏎", "Enter")} ${action}`,
      )
      .join(o.capabilities.unicode ? " · " : " | ");
  const input = (config: Parameters<typeof nativeInput>[0], ctx = context) =>
    nativeInput({ ...config, theme: baseTheme }, ctx);
  const password = (
    config: Parameters<typeof nativePassword>[0],
    ctx = context,
  ) => nativePassword({ ...config, theme: baseTheme }, ctx);
  const confirm = (
    config: Parameters<typeof nativeConfirm>[0],
    ctx = context,
  ) => nativeConfirm({ ...config, theme: baseTheme }, ctx);
  function select<T>(
    config: Parameters<typeof nativeSelect<T>>[0],
    ctx = context,
  ) {
    return nativeSelect<T>(
      {
        ...config,
        theme: {
          ...baseTheme,
          ...(!o.capabilities.unicode ? { icon: { cursor: ">" } } : {}),
          style: { ...style, keysHelpTip },
        },
      },
      ctx,
    );
  }
  function checkbox<T>(
    config: Parameters<typeof nativeCheckbox<T>>[0],
    ctx = context,
  ) {
    return nativeCheckbox<T>(
      {
        ...config,
        theme: {
          ...baseTheme,
          icon: { cursor: ">", checked: "[x]", unchecked: "[ ]" },
          style: { ...style, keysHelpTip },
        },
      },
      ctx,
    );
  }
  const session = o.session,
    operation = new Operation(o.scope, o.task?.effect ?? "local");
  const abortSession = () => {
    operation.cancel();
    session.dispose();
  };
  o.signal?.addEventListener("abort", abortSession, { once: true });
  const line = (s: string) => o.output.write(safeText(s) + "\n");
  async function ask<T>(prompt: Promise<T> & { cancel(): void }): Promise<T> {
    let escaped = false;
    const escape = (data: Buffer | string) => {
      if (String(data) === "\x1b") {
        escaped = true;
        prompt.cancel();
      }
    };
    o.input.on("data", escape);
    try {
      return await prompt;
    } catch (error) {
      if (escaped) throw new PanelBack();
      throw error;
    } finally {
      o.input.off("data", escape);
    }
  }
  try {
    while (!session.closed) {
      if (o.signal?.aborted)
        return {
          status: "cancelled",
          message: "Interrompido. Nenhum salvamento implícito.",
        };
      line(
        `${o.title} / ${o.scope} ${o.capabilities.unicode ? "—" : "-"} ${session.dirty ? "Alterações não salvas" : "Sem alterações"}`,
      );
      if (session.status) line(session.status);
      const filter =
        session.fields.length > 10
          ? await input(
              { message: "Buscar campos (vazio mostra todos)" },
              context,
            )
          : "";
      const fields = session.fields.filter((f) =>
        `${f.label} ${f.description}`
          .toLocaleLowerCase()
          .includes(filter.toLocaleLowerCase()),
      );
      let action: string;
      try {
        action = await ask(
          select(
            {
              message: "Configurações — escolha uma ação",
              loop: false,
              choices: [
                ...fields.map((f) => ({
                  value: f.id,
                  name: `${safeText(f.label)}: ${f.kind === "secret" ? "[protegido]" : safeText(String(session.effective[f.id]))}${f.override ? ` [origem: ${safeText(f.override.source)}]` : ""}`,
                  description: safeText(f.description),
                })),
                { value: "@save", name: "Salvar alterações" },
                ...(o.task ? [{ value: "@run", name: o.task.label }] : []),
                { value: "@help", name: "Ajuda" },
                { value: "@close", name: "Fechar" },
              ],
            },
            context,
          ),
        );
      } catch (error) {
        if (error instanceof PanelBack) action = "@close";
        else throw error;
      }
      if (action === "@help") {
        line(
          "Setas navegam sem alterar valores. Enter edita; Salvar persiste e mantém o painel. Ctrl+C interrompe sem salvar. Fechar permite continuar, salvar ou descartar. O modo --ui linear aceita escolhas numeradas sem redesenho.",
        );
        continue;
      }
      if (action === "@save") {
        await session.save(o.persist);
        continue;
      }
      if (action === "@run" && o.task) {
        let interrupted = false;
        const abort = () => {
          operation.cancel();
        };
        o.signal?.addEventListener("abort", abort, { once: true });
        const cancelKey = (chunk: Buffer | string) => {
          if (String(chunk) === "\x03") interrupted = true;
          if (String(chunk) === "?")
            line(
              "Esc solicita cancelamento. Ctrl+C interrompe. Cancelar não desfaz efeitos já aplicados.",
            );
          if (String(chunk) === "\x1b" || String(chunk) === "\x03") abort();
        };
        const tty = o.input as Readable & {
          isRaw?: boolean;
          setRawMode?: (raw: boolean) => void;
        };
        const priorRaw = tty.isRaw ?? false;
        tty.setRawMode?.(true);
        o.input.on("data", cancelKey);
        o.input.resume();
        line("Operação iniciada. Esc solicita cancelamento.");
        try {
          const result = await operation.run(
            (signal, report) =>
              o.task!.run(session.draft, signal, (label, done, total) => {
                report(label, done, total);
                if (!operation.active || signal.aborted || o.signal?.aborted)
                  return;
                line(
                  total && done !== undefined
                    ? `${label}: ${done}/${total}`
                    : label,
                );
              }),
            o.task.timeoutMs,
          );
          line(
            result.status === "succeeded"
              ? "Operação concluída."
              : result.message,
          );
          if (interrupted || o.signal?.aborted)
            return {
              status: "cancelled",
              message: "Interrompido. Nenhum salvamento implícito.",
            };
        } finally {
          o.input.off("data", cancelKey);
          tty.setRawMode?.(priorRaw);
          o.signal?.removeEventListener("abort", abort);
        }
        continue;
      }
      if (action === "@close") {
        session.back();
        if (session.closeDecision) {
          let choice: "continue" | "saveClose" | "discard" = "continue";
          try {
            choice = await ask(
              select(
                {
                  message: "Há alterações não salvas",
                  loop: false,
                  default: "continue",
                  choices: [
                    { value: "continue" as const, name: "Continuar editando" },
                    { value: "saveClose" as const, name: "Salvar e fechar" },
                    { value: "discard" as const, name: "Descartar alterações" },
                  ],
                },
                context,
              ),
            );
          } catch (error) {
            if (!(error instanceof PanelBack)) throw error;
          }
          await session.decide(choice, o.persist);
        }
        continue;
      }
      const f = session.fields.find((f) => f.id === action)!;
      session.begin(f.id);
      if (!session.editing) continue;
      try {
        if (f.kind === "secret")
          session.edit(
            await ask(
              password({ message: safeText(f.label), mask: true }, context),
            ),
          );
        else if (f.kind === "select")
          session.edit(
            await ask(
              select(
                {
                  message: safeText(f.label),
                  loop: false,
                  default: session.draft[f.id],
                  choices: (f.choices ?? []).map((c) => ({
                    value: c.id,
                    name: safeText(c.label),
                    ...(c.disabled ? { disabled: safeText(c.disabled) } : {}),
                  })),
                },
                context,
              ),
            ),
          );
        else if (f.kind === "multiselect")
          session.edit(
            await ask(
              checkbox(
                {
                  message: safeText(f.label),
                  loop: false,
                  choices: (f.choices ?? []).map((c) => ({
                    value: c.id,
                    name: safeText(c.label),
                    checked: (session.draft[f.id] as string[]).includes(c.id),
                    ...(c.disabled ? { disabled: safeText(c.disabled) } : {}),
                  })),
                },
                context,
              ),
            ),
          );
        else if (f.kind === "boolean")
          session.edit(
            await ask(
              confirm(
                {
                  message: safeText(f.label),
                  default: Boolean(session.draft[f.id]),
                },
                context,
              ),
            ),
          );
        else {
          const text = await ask(
            input(
              {
                message: safeText(f.label),
                default: String(session.draft[f.id]),
              },
              context,
            ),
          );
          session.edit(
            f.kind === "number" ? (text.trim() ? Number(text) : NaN) : text,
          );
        }
      } catch (error) {
        if (error instanceof PanelBack) {
          session.abandonEdit();
          continue;
        }
        throw error;
      }
      if (!session.confirmEdit()) line(`Erro: ${session.errors[f.id]}`);
    }
    return { status: "succeeded", value: session.persisted };
  } catch (error) {
    const cancelled =
      o.signal?.aborted ||
      ["ExitPromptError", "AbortPromptError"].includes((error as Error).name);
    return {
      status: cancelled ? "cancelled" : "failed",
      message: cancelled
        ? "Interrompido. Nenhum salvamento implícito."
        : "Não foi possível apresentar a interface. Use o modo linear.",
    };
  } finally {
    o.signal?.removeEventListener("abort", abortSession);
    operation.dispose();
    session.dispose();
  }
}
