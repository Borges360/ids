import {
  SettingsSession,
  type Field,
  type Values,
  type Persist,
  type PanelTask,
} from "@inteiro/terminal";
import { mkdir, readFile, rename, writeFile, rm } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { setTimeout } from "node:timers/promises";
export const fields: Field[] = [
  {
    id: "connection",
    label: "Conexão",
    description:
      "Destino usado pelo projeto. Testar usa o rascunho sem salvar.",
    kind: "select",
    choices: [
      { id: "local", label: "Local" },
      { id: "lab", label: "Homelab" },
    ],
  },
  {
    id: "language",
    label: "Idioma",
    description: "Idioma das mensagens do consumidor.",
    kind: "select",
    choices: [
      { id: "pt-BR", label: "Português" },
      { id: "en", label: "English" },
    ],
  },
  {
    id: "limit",
    label: "Limite de tarefas",
    description: "Quantidade de tarefas simultâneas, entre 1 e 8.",
    kind: "number",
    validate: (v) =>
      Number.isInteger(v) && Number(v) >= 1 && Number(v) <= 8
        ? undefined
        : "Informe um inteiro entre 1 e 8.",
  },
];
export const defaults: Values = {
  connection: "local",
  language: "pt-BR",
  limit: 3,
};
export async function loadSession(file?: string) {
  let values = structuredClone(defaults);
  if (file) {
    try {
      const saved: unknown = JSON.parse(await readFile(file, "utf8"));
      if (!saved || typeof saved !== "object" || Array.isArray(saved))
        throw new Error("Configuração inválida");
      values = { ...values, ...saved };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    }
  }
  const session = new SettingsSession(fields, values);
  if (!session.validate())
    throw new Error("Configuração inválida: revise o arquivo de preferências.");
  const persist: Persist = async (next, signal) => {
    if (!file)
      throw new Error(
        "Informe --config para persistir. O rascunho será preservado.",
      );
    await mkdir(dirname(file), { recursive: true });
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, JSON.stringify(next, null, 2) + "\n", {
        mode: 0o600,
        signal,
      });
      signal.throwIfAborted();
      await rename(temporary, file);
    } finally {
      await rm(temporary, { force: true });
    }
  };
  return { session, persist };
}
/** Deterministic local diagnostics: exercises cancellation without inventing network endpoints. */
export const diagnostics: PanelTask = {
  label: "Testar rascunho",
  timeoutMs: 5000,
  effect: "local",
  async run(draft, signal, report) {
    report(`Validando conexão ${draft.connection}`, 0, 2);
    await setTimeout(250, undefined, { signal });
    report("Conferindo limites", 1, 2);
    await setTimeout(250, undefined, { signal });
    report("Diagnóstico local concluído", 2, 2);
    return {
      connection: draft.connection,
      limit: draft.limit,
      networkTested: false,
    };
  },
};
