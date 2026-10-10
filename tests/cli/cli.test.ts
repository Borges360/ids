import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { run } from "../../packages/cli/src/cli.ts";

async function capture(argv: string[]): Promise<{ code: number; out: string }> {
  const logs: string[] = [];
  const orig = console.log;
  console.log = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  };
  try {
    const code = await run(argv);
    return { code, out: logs.join("\n") };
  } finally {
    console.log = orig;
  }
}

describe("CLI INTEIRO", () => {
  it("mostra ajuda", async () => {
    const { code, out } = await capture(["--help"]);
    expect(code).toBe(0);
    expect(out).toContain("tokens list");
  });

  it("lista e explica tokens", async () => {
    const list = await capture(["tokens", "list", "--json"]);
    expect(list.code).toBe(0);
    expect(list.out).toContain("color.identity.primary");
    const explain = await capture(["tokens", "explain", "color.identity.commit", "--json"]);
    expect(explain.code).toBe(0);
    expect(explain.out).toContain("tornando real");
  });

  it("valida o catálogo", async () => {
    const { code } = await capture(["tokens", "validate", "--json"]);
    expect(code).toBe(0);
  });

  it("exporta css json e ts", async () => {
    for (const format of ["css", "json", "ts"]) {
      const { code, out } = await capture(["tokens", "export", "--format", format, "--json"]);
      expect(code).toBe(0);
      expect(out).toContain(format);
    }
  });

  it("init é idempotente e preserva AGENTS.md existente", async () => {
    const dir = await mkdtemp(join(tmpdir(), "inteiro-"));
    await writeFile(join(dir, "AGENTS.md"), "# existente\n", "utf8");
    await writeFile(join(dir, "package.json"), "{\"name\":\"demo\"}", "utf8");
    const first = await capture(["init", "--cwd", dir, "--yes", "--json"]);
    const second = await capture(["init", "--cwd", dir, "--yes", "--json"]);
    const agents = await readFile(join(dir, "AGENTS.md"), "utf8");
    expect(first.code).toBe(0);
    expect(second.code).toBe(0);
    expect(agents.startsWith("# existente")).toBe(true);
    expect(agents).toContain("inteiro:start");
    expect(agents.match(/inteiro:start/g)?.length).toBe(1);
    await rm(dir, { recursive: true, force: true });
  });

  it("agents install all --dry-run não falha", async () => {
    const dir = await mkdtemp(join(tmpdir(), "inteiro-ag-"));
    const { code, out } = await capture(["agents", "install", "all", "--cwd", dir, "--dry-run", "--json"]);
    expect(code).toBe(0);
    expect(out).toContain("codex");
    await rm(dir, { recursive: true, force: true });
  });

  it("agents install cursor e uninstall são seguros", async () => {
    const dir = await mkdtemp(join(tmpdir(), "inteiro-c-"));
    const ins = await capture(["agents", "install", "cursor", "--cwd", dir, "--yes", "--json"]);
    expect(ins.code).toBe(0);
    const doctor = await capture(["agents", "doctor", "--cwd", dir, "--json"]);
    expect(doctor.out).toContain("cursor");
    const un = await capture(["agents", "uninstall", "cursor", "--cwd", dir, "--yes", "--json"]);
    expect(un.code).toBe(0);
    await rm(dir, { recursive: true, force: true });
  });
});
