import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

type Entry = { version: string; status: string; path: string };
const manifest = JSON.parse(read("docs-archive/versions.json")) as { versions: Entry[] };

describe("documentação versionada", () => {
  it("lista a versão atual do pacote e as arquivadas, sem duplicar", () => {
    const pkg = JSON.parse(read("apps/demo/package.json")) as { version: string };
    const versions = manifest.versions.map((entry) => entry.version);
    expect(new Set(versions).size).toBe(versions.length);
    const atual = manifest.versions.filter((entry) => entry.status === "atual");
    expect(atual).toHaveLength(1);
    expect(atual[0]?.version).toBe(pkg.version);
    expect(atual[0]?.path).toBe("/");
  });

  it("cada versão arquivada tem cópia congelada e coerente", () => {
    for (const entry of manifest.versions.filter((item) => item.status === "arquivada")) {
      const dir = `docs-archive/${entry.version}`;
      expect(entry.path).toBe(`/v/${entry.version}/`);
      const meta = JSON.parse(read(`${dir}/ARCHIVE.json`)) as { version: string; commit: string };
      expect(meta.version).toBe(entry.version);
      expect(meta.commit).toMatch(/^[0-9a-f]{40}$/);
      const html = read(`${dir}/index.html`);
      expect(html).toContain("archive-banner");
      expect(html).toContain(`/v/${entry.version}/apps/demo/`);
      // nenhuma referência escapa do prefixo da versão
      expect(html).not.toMatch(/(?:href|src)="\/(?:apps|docs|packages\/tokens|packages\/design-system)\//);
      for (const file of ["packages/tokens/dist/css/inteiro.css", "packages/design-system/src/components.css", "apps/demo/app.js"]) {
        expect(existsSync(new URL(`../${dir}/${file}`, import.meta.url)), `${dir}/${file}`).toBe(true);
      }
    }
  });

  it("o servidor e a imagem servem as cópias", () => {
    expect(read("scripts/serve-demo.mjs")).toContain("/versions.json");
    expect(read("scripts/serve-demo.mjs")).toContain("/docs-archive/");
    expect(read("deploy/Dockerfile")).toContain("docs-archive");
    expect(read(".dockerignore")).toContain("!docs-archive/**");
    expect(read("apps/demo/index.html")).toContain('id="version-select"');
  });
});
