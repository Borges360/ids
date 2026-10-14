#!/usr/bin/env node
import { stdin, stdout } from "node:process";
import { allTokens, catalogStats } from "@inteiro/tokens";
import { callMcpTool, MCP_TOOLS } from "./tools.ts";

interface Rpc {
  jsonrpc: "2.0";
  id?: number | string | null;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: { code: number; message: string };
}

function result(id: Rpc["id"], payload: unknown): Rpc {
  return { jsonrpc: "2.0", id: id ?? null, result: payload };
}

function err(id: Rpc["id"], message: string): Rpc {
  return { jsonrpc: "2.0", id: id ?? null, error: { code: -32000, message } };
}

async function handle(msg: Rpc): Promise<Rpc> {
  if (msg.method === "initialize") {
    return result(msg.id, {
      protocolVersion: "2024-11-05",
      serverInfo: { name: "inteiro", version: "1.1.1" },
      capabilities: { tools: {}, resources: {} }
    });
  }
  if (msg.method === "notifications/initialized") return result(msg.id, {});
  if (msg.method === "tools/list") return result(msg.id, { tools: MCP_TOOLS });
  if (msg.method === "tools/call") {
    const name = String(msg.params?.name ?? "");
    const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
    try {
      const output = callMcpTool(name, args);
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

if (process.argv.includes("--help")) {
  console.log("INTEIRO MCP server v1.1.1 (stdio JSON-RPC). Ferramentas:\n" + MCP_TOOLS.map((t) => `- ${t.name}: ${t.description}`).join("\n"));
  process.exit(0);
}

let buffer = "";
stdin.setEncoding("utf8");
stdin.on("data", async (chunk) => {
  buffer += chunk;
  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) {
      const nl = buffer.indexOf("\n");
      if (nl !== -1 && !buffer.startsWith("Content-Length:")) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        try {
          const msg = JSON.parse(line) as Rpc;
          const response = await handle(msg);
          stdout.write(JSON.stringify(response) + "\n");
        } catch {
          /* ignore */
        }
        continue;
      }
      break;
    }
    const header = buffer.slice(0, headerEnd);
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      buffer = buffer.slice(headerEnd + 4);
      continue;
    }
    const len = Number(match[1]);
    const bodyStart = headerEnd + 4;
    if (buffer.length < bodyStart + len) break;
    const body = buffer.slice(bodyStart, bodyStart + len);
    buffer = buffer.slice(bodyStart + len);
    const msg = JSON.parse(body) as Rpc;
    const response = await handle(msg);
    const payload = JSON.stringify(response);
    stdout.write(`Content-Length: ${Buffer.byteLength(payload)}\r\n\r\n${payload}`);
  }
});
