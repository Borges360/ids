import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL("..", import.meta.url)));
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".md": "text/plain; charset=utf-8",
  ".woff2": "font/woff2"
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  if (url.pathname === "/health") {
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    res.end("ok");
    return;
  }
  let rel;
  if (url.pathname === "/" || url.pathname === "/index.html") rel = "/apps/demo/index.html";
  else if (
    url.pathname.startsWith("/packages/") ||
    url.pathname.startsWith("/docs/") ||
    url.pathname.startsWith("/apps/")
  ) rel = url.pathname;
  else rel = "/apps/demo" + url.pathname;
  const file = normalize(join(root, rel.replace(/^\/+/, "")));
  if (!file.startsWith(root)) {
    res.writeHead(403); res.end("forbidden"); return;
  }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404); res.end("not found");
  }
});

const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 4173);
server.listen(port, host, () => {
  console.log(`INTEIRO demo → http://${host}:${port}/`);
});
