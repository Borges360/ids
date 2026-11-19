import { createInterface } from "node:readline";
import type { Readable, Writable } from "node:stream";
import type { TerminalResult, Values, Capabilities } from "./contracts.ts";
import { safeText } from "./text.ts";
import type { SettingsSession, Persist } from "./settings.ts";
export interface LinearOptions {
  title: string;
  scope: string;
  session: SettingsSession;
  persist: Persist;
  capabilities: Capabilities;
  input: Readable;
  output: Writable;
  signal?: AbortSignal;
}
/** Append-only numbered interaction, including piped transcript fixtures only when explicitly interactive. */
export async function runLinear(
  o: LinearOptions,
): Promise<TerminalResult<Values>> {
  if (!o.capabilities.interactive || o.capabilities.mode === "json")
    return {
      status: "invalid",
      message: "Entrada ausente. Informe os argumentos em modo sem entrada.",
    };
  const readline = createInterface({ input: o.input, terminal: false });
  const iterator = readline[Symbol.asyncIterator]();
  const line = (s: string) => o.output.write(safeText(s) + "\n");
  let aborted = false;
  const abort = () => {
    aborted = true;
    o.session.dispose();
    readline.close();
  };
  o.signal?.addEventListener("abort", abort, { once: true });
  readline.on("SIGINT", abort);
  const ask = async (message: string) => {
    line(message);
    const result = await iterator.next();
    if (result.done || aborted) throw new Error("EOF");
    return String(result.value);
  };
  try {
    if (o.signal?.aborted) throw new Error("aborted");
    while (!o.session.closed) {
      const s = o.session;
      line(
        `${o.title} — ${o.scope} — ${s.dirty ? "Há alterações" : "Sem alterações"}`,
      );
      s.fields.forEach((f, i) =>
        line(
          `${i + 1}. ${f.label}: ${f.kind === "secret" ? "[protegido]" : String(s.effective[f.id])}${f.override ? ` [origem: ${f.override.source}]` : ""}`,
        ),
      );
      line("s. Salvar alterações | a. Ajuda | 0. Voltar");
      if (s.status) line(s.status);
      const value = await ask("Escolha uma opção:");
      if (value === "a") {
        line(
          "Digite o número para editar, s para salvar. Editar não persiste. 0 volta. Campo vazio mantém o valor; :voltar abandona a edição.",
        );
        continue;
      }
      if (value === "s") {
        const result = await s.save(o.persist);
        if (result.status !== "succeeded") line(result.message);
        continue;
      }
      if (value === "0") {
        s.back();
        if (s.closeDecision) {
          const choice = await ask(
            "Alterações pendentes: 1. Continuar editando 2. Salvar e fechar 3. Descartar alterações",
          );
          await s.decide(
            choice === "2"
              ? "saveClose"
              : choice === "3"
                ? "discard"
                : "continue",
            o.persist,
          );
        }
        continue;
      }
      const f = s.fields[Number(value) - 1];
      if (!f) {
        line("Escolha uma opção disponível.");
        continue;
      }
      if (f.kind === "secret") {
        line(
          "Entrada de segredo indisponível em modo com eco. Informe por canal seguro do produto ou use prompts.",
        );
        continue;
      }
      s.begin(f.id);
      if (!s.editing) continue;
      line(f.description);
      if (f.choices)
        f.choices.forEach((c, i) =>
          line(
            `${i + 1}. ${c.label}${c.disabled ? ` [indisponível: ${c.disabled}]` : ""}`,
          ),
        );
      const text = await ask(`${f.label} (vazio mantém; :voltar cancela):`);
      if (text === ":voltar" || text === "") {
        s.abandonEdit();
        continue;
      }
      if (f.kind === "select") s.edit(f.choices?.[Number(text) - 1]?.id ?? "");
      else if (f.kind === "multiselect")
        s.edit(
          text
            .split(",")
            .map((n) => f.choices?.[Number(n.trim()) - 1]?.id ?? ""),
        );
      else if (f.kind === "boolean") {
        const normalized = text.toLocaleLowerCase();
        if (
          !["sim", "s", "true", "1", "não", "nao", "n", "false", "0"].includes(
            normalized,
          )
        ) {
          line("Informe sim ou não.");
          s.abandonEdit();
          continue;
        }
        s.edit(["sim", "s", "true", "1"].includes(normalized));
      } else s.edit(f.kind === "number" ? Number(text) : text);
      if (!s.confirmEdit()) {
        line(`Erro: ${s.errors[f.id]}`);
        s.abandonEdit();
      }
    }
    return { status: "succeeded", value: o.session.persisted };
  } catch {
    return {
      status: "cancelled",
      message: "Entrada encerrada. Nenhum salvamento implícito.",
    };
  } finally {
    o.signal?.removeEventListener("abort", abort);
    readline.close();
    o.session.dispose();
  }
}
