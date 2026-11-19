import {
  openPiSettings,
  openPiWorkspace,
  type PiUI,
} from "@inteiro/terminal/pi";
import { WorkspaceModel } from "@inteiro/terminal";
import { loadSession, diagnostics } from "./shared.ts";
import { join } from "node:path";
/** Opt-in pilot; loading it does not migrate any installed extension or the harness template. */
interface ExtensionAPI {
  registerCommand(
    name: string,
    command: {
      description: string;
      handler(
        args: string,
        ctx: { cwd: string; ui: PiUI; hasUI: boolean },
      ): Promise<void>;
    },
  ): void;
  on(event: string, handler: () => void): void;
}
export default function terminalPilot(pi: ExtensionAPI) {
  let owner: AbortController | undefined;
  pi.on("session_shutdown", () => owner?.abort());
  pi.on("session_switch", () => owner?.abort());
  pi.registerCommand("terminal-preferences", {
    description: "Piloto optativo INTEIRO Terminal: preferências do projeto",
    async handler(_args, ctx) {
      if (!ctx.hasUI || owner) return;
      const abort = new AbortController();
      owner = abort;
      try {
        const { session, persist } = await loadSession(
          join(ctx.cwd, ".inteiro", "terminal-preferences.json"),
        );
        await openPiSettings(ctx.ui, {
          title: "Preferências",
          scope: "projeto atual",
          session,
          persist,
          signal: abort.signal,
          reservedKeys: ["ctrl+c"],
          task: diagnostics,
        });
      } finally {
        abort.abort();
        if (owner === abort) owner = undefined;
      }
    },
  });
  pi.registerCommand("terminal-workspace", {
    description: "Lista/detalhe, tabela e logs das preferências",
    async handler(_args, ctx) {
      if (!ctx.hasUI || owner) return;
      const abort = new AbortController();
      owner = abort;
      try {
        const { session } = await loadSession(
          join(ctx.cwd, ".inteiro", "terminal-preferences.json"),
        );
        const model = new WorkspaceModel({
          records: session.fields.map((f) => ({
            id: f.id,
            label: f.label,
            fields: { Campo: f.label, Valor: String(session.effective[f.id]) },
          })),
          columns: [
            { id: "Campo", label: "Campo", priority: 0 },
            { id: "Valor", label: "Valor", priority: 1 },
          ],
          logLimit: 100,
        });
        model.log.append(
          "Preferências carregadas localmente.\nNenhuma rede foi consultada.\nUse Pausar/Retomar e exportação textual do modelo.",
        );
        await openPiWorkspace(ctx.ui, model, abort.signal);
        session.dispose();
      } finally {
        abort.abort();
        if (owner === abort) owner = undefined;
      }
    },
  });
}
