import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createMcpHttpServer } from "./http.ts";
import { MCP_TOOLS } from "./tools.ts";

const server = createMcpHttpServer();
let base = "";

beforeAll(async () => {
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

const post = (body: unknown, headers: Record<string, string> = {}) =>
  fetch(`${base}/mcp`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) });

describe("MCP por HTTP", () => {
  it("responde /health com a versão do servidor", async () => {
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ status: "ok", name: "inteiro" });
    expect(body.version).toMatch(/^\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/);
  });

  it("inicializa e lista exatamente as ferramentas do pacote", async () => {
    const init = await (await post({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} })).json();
    expect(init.result.serverInfo).toMatchObject({ name: "inteiro" });
    const list = await (await post({ jsonrpc: "2.0", id: 2, method: "tools/list" })).json();
    expect(list.result.tools.map((t: { name: string }) => t.name)).toEqual(MCP_TOOLS.map((t) => t.name));
  });

  it("executa uma ferramenta e devolve erro de ferramenta sem derrubar o servidor", async () => {
    const ok = await (await post({
      jsonrpc: "2.0", id: 3, method: "tools/call",
      params: { name: "inteiro_audit", arguments: { file: "screen.css", source: "button { outline: none; }" } }
    })).json();
    expect(JSON.parse(ok.result.content[0].text)).toMatchObject([{ kind: "a11y", line: 1 }]);
    const bad = await (await post({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "missing", arguments: {} } })).json();
    expect(bad.result.isError).toBe(true);
    expect((await fetch(`${base}/health`)).status).toBe(200);
  });

  it("aceita notificação (202) e lote com respostas só para chamadas com id", async () => {
    const note = await post({ jsonrpc: "2.0", method: "notifications/initialized" });
    expect(note.status).toBe(202);
    const batch = await post([
      { jsonrpc: "2.0", method: "notifications/initialized" },
      { jsonrpc: "2.0", id: 5, method: "ping" }
    ]);
    expect(await batch.json()).toEqual([{ jsonrpc: "2.0", id: 5, result: {} }]);
  });

  it("recusa JSON inválido, lote vazio, método errado, rota errada, Origin e corpo grande", async () => {
    expect((await post("{ não é json")).status).toBe(400);
    expect((await post("[]")).status).toBe(400);
    expect((await fetch(`${base}/mcp`)).status).toBe(405);
    expect((await fetch(`${base}/outra`)).status).toBe(404);
    expect((await post({ jsonrpc: "2.0", id: 6, method: "ping" }, { origin: "https://exemplo.test" })).status).toBe(403);
    expect((await post("x".repeat(1024 * 1024 + 1))).status).toBe(413);
  });
});
