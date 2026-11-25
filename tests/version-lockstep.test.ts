import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const json = (path: string) => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), "utf8")) as { name?: string; version: string };

describe("versão única do release train", () => {
  it("raiz, demo e todos os pacotes saem na mesma versão", () => {
    const root = json("package.json").version;
    const packages = readdirSync(new URL("../packages", import.meta.url), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `packages/${entry.name}/package.json`);
    const versions = Object.fromEntries([["package.json", root], ["apps/demo/package.json", json("apps/demo/package.json").version], ...packages.map((path) => [path, json(path).version])]);
    expect(Object.fromEntries(Object.entries(versions).filter(([, version]) => version !== root))).toEqual({});
  });

  it("a página exibe a versão do pacote", () => {
    const root = json("package.json").version;
    expect(readFileSync(new URL("../apps/demo/version.js", import.meta.url), "utf8")).toContain(`"${root}"`);
  });
});
