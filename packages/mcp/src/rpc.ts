import { allTokens, catalogStats } from "@inteiro/tokens";
import { callMcpTool, MCP_TOOLS } from "./tools.ts";

export const SERVER_VERSION = "2.0.0-rc.1";

export interface Rpc {
  jsonrpc: "2.0";
  id?: number | string | null;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: { code: number; message: string };
}

export function result(id: Rpc["id"], payload: unknown): Rpc {
  return { jsonrpc: "2.0", id: id ?? null, result: payload };
}

export function err(id: Rpc["id"], message: string): Rpc {
  return { jsonrpc: "2.0", id: id ?? null, error: { code: -32000, message } };
}

export async function handle(msg: Rpc): Promise<Rpc | undefined> {
  if (msg.id === undefined) return;
  if (msg.method === "initialize") {
    return result(msg.id, {
      protocolVersion: "2024-11-05",
      serverInfo: { name: "inteiro", version: SERVER_VERSION },
      capabilities: { tools: {}, resources: {} }
    });
  }
  if (msg.method === "notifications/initialized") return result(msg.id, {});
  if (msg.method === "tools/list") return result(msg.id, { tools: MCP_TOOLS });
  if (msg.method === "tools/call") {
    const name = String(msg.params?.name ?? "");
    const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
    try {
      const output = await callMcpTool(name, args);
      return result(msg.id, { content: [{ type: "text", text: JSON.stringify(output, null, 2) }] });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao executar a ferramenta.";
      return result(msg.id, { content: [{ type: "text", text: message }], isError: true });
    }
  }
  if (msg.method === "resources/list") {
    return result(msg.id, {
      resources: [
        { uri: "inteiro://catalog/stats", name: "Catalog stats" },
        { uri: "inteiro://tokens", name: "Token ids" },
        { uri: "inteiro://guides/visual-review", name: "Visual review protocol" }
      ]
    });
  }
  if (msg.method === "resources/read") {
    const uri = String(msg.params?.uri ?? "");
    if (uri === "inteiro://catalog/stats") {
      return result(msg.id, { contents: [{ uri, text: JSON.stringify(catalogStats(), null, 2) }] });
    }
    if (uri === "inteiro://tokens") {
      return result(msg.id, { contents: [{ uri, text: allTokens().map((t) => t.id).join("\n") }] });
    }
    if (uri === "inteiro://guides/visual-review") {
      const guide = callMcpTool("inteiro_get_visual_review", {});
      return result(msg.id, { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(guide, null, 2) }] });
    }
  }
  if (msg.method === "ping") return result(msg.id, {});
  return err(msg.id, `Método não suportado: ${msg.method}`);
}
