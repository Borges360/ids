#!/usr/bin/env node
// Servidor MCP do INTEIRO por HTTP (streamable-http, sem sessão): o MCPHub fala com ele por URL
// interna em vez de iniciar um processo local. Roda na mesma imagem do site, então a versão
// do MCP é sempre a do container. As ferramentas são só de leitura sobre o catálogo e sobre
// texto recebido; nada lê arquivo, rede ou segredo.
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { pathToFileURL } from "node:url";
import { err, handle, SERVER_VERSION, type Rpc } from "./rpc.ts";

const MAX_BODY_BYTES = 1024 * 1024;

function send(res: ServerResponse, status: number, body?: unknown, headers: Record<string, string> = {}): void {
  const payload = body === undefined ? undefined : JSON.stringify(body);
  res.writeHead(status, {
    ...(payload === undefined ? {} : { "content-type": "application/json; charset=utf-8", "content-length": Buffer.byteLength(payload) }),
    "cache-control": "no-store",
    ...headers
  });
  res.end(payload);
}

async function readBody(req: IncomingMessage): Promise<Buffer | "too-large"> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) return "too-large";
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

async function answer(message: unknown): Promise<Rpc | undefined> {
  if (typeof message !== "object" || message === null || Array.isArray(message)) {
    return err(null, "Invalid JSON-RPC request");
  }
  return handle(message as Rpc);
}

export function createMcpHttpServer(): Server {
  return createServer(async (req, res) => {
    try {
      const path = new URL(req.url ?? "/", "http://localhost").pathname;
      if (path === "/health" || path === "/healthz") {
        if (req.method !== "GET" && req.method !== "HEAD") return send(res, 405, undefined, { allow: "GET, HEAD" });
        return send(res, 200, { status: "ok", name: "inteiro", version: SERVER_VERSION });
      }
      if (path !== "/mcp") return send(res, 404, { error: "not found" });
      if (req.method !== "POST") return send(res, 405, undefined, { allow: "POST" });
      // Clientes de servidor não enviam Origin; um navegador enviaria (defesa contra DNS rebinding).
      if (req.headers.origin) return send(res, 403, { error: "origin not allowed" });

      const raw = await readBody(req);
      if (raw === "too-large") return send(res, 413, err(null, "Message exceeds 1 MiB limit"));
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.toString("utf8"));
      } catch {
        return send(res, 400, err(null, "Invalid JSON-RPC request"));
      }

      if (Array.isArray(parsed)) {
        if (parsed.length === 0) return send(res, 400, err(null, "Invalid JSON-RPC request"));
        const replies = (await Promise.all(parsed.map(answer))).filter((r): r is Rpc => r !== undefined);
        return replies.length === 0 ? send(res, 202) : send(res, 200, replies);
      }
      const reply = await answer(parsed);
      return reply === undefined ? send(res, 202) : send(res, 200, reply);
    } catch {
      if (!res.headersSent) send(res, 500, err(null, "Internal error"));
      else res.end();
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT ?? 8080);
  const host = process.env.HOST ?? "0.0.0.0";
  const server = createMcpHttpServer();
  server.listen(port, host, () => {
    const address = server.address();
    const actual = typeof address === "object" && address ? address.port : port;
    console.log(`INTEIRO MCP server v${SERVER_VERSION} (HTTP) em http://${host}:${actual}/mcp`);
  });
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    process.on(signal, () => server.close(() => process.exit(0)));
  }
}
