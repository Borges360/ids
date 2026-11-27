// Monta o servidor MCP HTTP do INTEIRO como pasta autossuficiente (runtime/inteiro-mcp).
// O pacote lê três grupos de arquivos relativos ao próprio local (../catalog.index.json,
// ../schemas, ../json); a pasta repete esse layout para que a imagem não dependa do monorepo.
// Usado pelo Dockerfile do ids: o MCP sobe na mesma imagem e na mesma versão do site.
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { build } from "esbuild";

const out = join("runtime", "inteiro-mcp");
const resources = [
  ["packages/composition/catalog.index.json", "catalog.index.json"],
  ["packages/contracts/schemas", "schemas"],
  ["packages/tokens/dist/json", "json"]
];

for (const [source] of resources) {
  if (!existsSync(source)) {
    console.error(`Recurso ausente: ${source}. Rode build -w @inteiro/tokens e build:composition antes.`);
    process.exit(1);
  }
}

rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, "dist"), { recursive: true });
await build({
  entryPoints: ["packages/mcp/src/http.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  outfile: join(out, "dist", "inteiro-mcp.mjs"),
  // Dependências CommonJS (ex.: yaml) chamam require() dentro de um pacote ESM.
  banner: { js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);' },
  logLevel: "warning"
});
for (const [source, target] of resources) cpSync(source, join(out, target), { recursive: true });
console.log(`MCP HTTP do INTEIRO empacotado em ${out}`);
