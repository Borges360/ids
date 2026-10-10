#!/usr/bin/env node
import { stdin, stdout } from "node:process";
import {
  auditSource,
  explainToken,
  getComponentRecipe,
  getGuidelines,
  getTheme,
  getToken,
  searchTokens,
  suggestTokens,
  validateUsage
} from "@inteiro/agent-core";
import { allTokens, catalogStats } from "@inteiro/tokens";

interface Rpc {
  jsonrpc: "2.0";
  id?: number | string | null;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: { code: number; message: string };
}

const tools = [
  { name: "inteiro_get_token", description: "Obtém um token INTEIRO pelo id canônico.", inputSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
  { name: "inteiro_search_tokens", description: "Busca tokens por intenção, categoria ou id.", inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } },
  { name: "inteiro_explain_token", description: "Explica um token: intenção, uso, a11y, valores por tema.", inputSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
  { name: "inteiro_get_guidelines", description: "Guidelines de identidade, voz, a11y, marca.", inputSchema: { type: "object", properties: { topic: { type: "string" } } } },
  { name: "inteiro_get_component_recipe", description: "Recipe de componente INTEIRO.", inputSchema: { type: "object", properties: { name: { type: "string" } } } },
  { name: "inteiro_get_theme", description: "Inspeciona um tema.", inputSchema: { type: "object", properties: { name: { type: "string" } }, required: ["name"] } },
  { name: "inteiro_suggest_tokens", description: "Sugere tokens a partir de um contexto em linguagem natural.", inputSchema: { type: "object", properties: { context: { type: "string" } }, required: ["context"] } },
  { name: "inteiro_validate_usage", description: "Valida um trecho de código contra regras INTEIRO.", inputSchema: { type: "object", properties: { code: { type: "string" }, token: { type: "string" } } } },
  { name: "inteiro_audit", description: "Audita um arquivo-fonte (conteúdo textual).", inputSchema: { type: "object", properties: { file: { type: "string" }, source: { type: "string" } }, required: ["file", "source"] } }
];

function result(id: Rpc["id"], payload: unknown): Rpc {
  return { jsonrpc: "2.0", id: id ?? null, result: payload };
}

function err(id: Rpc["id"], message: string): Rpc {
  return { jsonrpc: "2.0", id: id ?? null, error: { code: -32000, message } };
}

function callTool(name: string, args: Record<string, unknown>): unknown {
  switch (name) {
    case "inteiro_get_token":
      return getToken(String(args.name));
    case "inteiro_search_tokens":
      return searchTokens(String(args.query)).slice(0, 50);
    case "inteiro_explain_token":
      return explainToken(String(args.name));
    case "inteiro_get_guidelines":
      return getGuidelines(args.topic ? String(args.topic) : undefined);
    case "inteiro_get_component_recipe":
      return getComponentRecipe(args.name ? String(args.name) : undefined);
    case "inteiro_get_theme":
      return getTheme(String(args.name));
    case "inteiro_suggest_tokens":
      return suggestTokens(String(args.context));
    case "inteiro_validate_usage":
      return validateUsage({
        ...(args.code ? { code: String(args.code) } : {}),
        ...(args.token ? { token: String(args.token) } : {})
      });
    case "inteiro_audit":
      return auditSource(String(args.file), String(args.source));
    default:
      throw new Error(`Ferramenta desconhecida: ${name}`);
  }
}

async function handle(msg: Rpc): Promise<Rpc> {
  if (msg.method === "initialize") {
    return result(msg.id, {
      protocolVersion: "2024-11-05",
      serverInfo: { name: "inteiro", version: "1.0.0" },
      capabilities: { tools: {}, resources: {} }
    });
  }
  if (msg.method === "notifications/initialized") return result(msg.id, {});
  if (msg.method === "tools/list") return result(msg.id, { tools });
  if (msg.method === "tools/call") {
    const name = String(msg.params?.name ?? "");
    const args = (msg.params?.arguments ?? {}) as Record<string, unknown>;
    const output = callTool(name, args);
    return result(msg.id, { content: [{ type: "text", text: JSON.stringify(output, null, 2) }] });
  }
  if (msg.method === "resources/list") {
    return result(msg.id, {
      resources: [
        { uri: "inteiro://catalog/stats", name: "Catalog stats" },
        { uri: "inteiro://tokens", name: "Token ids" }
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
  }
  if (msg.method === "ping") return result(msg.id, {});
  return err(msg.id, `Método não suportado: ${msg.method}`);
}

if (process.argv.includes("--help")) {
  console.log("INTEIRO MCP server (stdio JSON-RPC). Ferramentas:\n" + tools.map((t) => `- ${t.name}: ${t.description}`).join("\n"));
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
