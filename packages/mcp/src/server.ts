#!/usr/bin/env node
import { stdin, stdout } from "node:process";
import { MCP_TOOLS } from "./tools.ts";
import { err, handle, SERVER_VERSION, type Rpc } from "./rpc.ts";

if (process.argv.includes("--help")) {
  console.log(`INTEIRO MCP server v${SERVER_VERSION} (stdio JSON-RPC). Ferramentas:\n` + MCP_TOOLS.map((t) => `- ${t.name}: ${t.description}`).join("\n"));
  process.exit(0);
}

let buffer = Buffer.alloc(0);
stdin.on("data", async (chunk) => {
  buffer = Buffer.concat([buffer,chunk]);
  if(buffer.length>4*1024*1024){stdout.write(JSON.stringify(err(null,'Message exceeds 4 MiB limit'))+'\n');buffer=Buffer.alloc(0);return;}
  while (true) {
    const headerEnd = buffer.indexOf("\r\n\r\n");
    if (headerEnd === -1) {
      const nl = buffer.indexOf("\n");
      if (nl !== -1 && !buffer.subarray(0,15).toString('utf8').startsWith("Content-Length:")) {
        const line = buffer.subarray(0, nl).toString('utf8').trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        try {
          const msg = JSON.parse(line) as Rpc;
          const response = await handle(msg);
          if(response)stdout.write(JSON.stringify(response) + "\n");
        } catch {
          /* ignore */
        }
        continue;
      }
      break;
    }
    const header = buffer.subarray(0, headerEnd).toString('ascii');
    const match = header.match(/Content-Length:\s*(\d+)/i);
    if (!match) {
      buffer = buffer.slice(headerEnd + 4);
      continue;
    }
    const len = Number(match[1]);
    const bodyStart = headerEnd + 4;
    if (buffer.length < bodyStart + len) break;
    const body = buffer.subarray(bodyStart, bodyStart + len).toString('utf8');
    buffer = buffer.slice(bodyStart + len);
    try{const msg = JSON.parse(body) as Rpc;
    const response = await handle(msg);
    if(response){const payload = JSON.stringify(response);
    stdout.write(`Content-Length: ${Buffer.byteLength(payload)}\r\n\r\n${payload}`);}}catch{const payload=JSON.stringify(err(null,'Invalid JSON-RPC request'));stdout.write(`Content-Length: ${Buffer.byteLength(payload)}\r\n\r\n${payload}`);}
  }
});
