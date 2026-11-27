import { describe, it, expect, afterAll } from "vitest";
import { spawnSync } from "node:child_process";
import { appendFileSync, mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
// @ts-expect-error plain ESM script without declarations
import { vendor, check, closure } from "../../scripts/vendor-terminal.mjs";

// Inside node_modules/.cache so the vendored pi.js resolves @earendil-works/pi-tui from the IDS install.
const cache = resolve("node_modules/.cache");
mkdirSync(cache, { recursive: true });
const base = mkdtempSync(join(cache, "vendor-terminal-test-"));
afterAll(() => rmSync(base, { recursive: true, force: true }));

describe("vendor:terminal", () => {
  it("computes the minimal Pi closure without prompts, linear or string-width", () => {
    const { files, externals } = closure();
    expect(files).toContain("pi.ts");
    expect(files).not.toContain("prompts.ts");
    expect(files).not.toContain("linear.ts");
    expect(files).not.toContain("index.ts");
    expect(externals).toEqual(["@earendil-works/pi-tui"]);
  });
  for (const format of ["ts", "js"] as const)
    it(`writes a verifiable ${format} copy with provenance and detects drift`, async () => {
      const out = join(base, format);
      const m = vendor({ out, format, date: "2026-11-23T00:00:00Z", allowDirty: true });
      expect(m.version).toBe("2.0.0-rc.1");
      expect(m.contract).toBe("1.0.0");
      expect(m.source.commit).toMatch(/^[a-f0-9]{40}$/);
      expect(m.source.date).toBe("2026-11-23T00:00:00.000Z");
      expect(m.patches).toEqual([]);
      expect(m.files.every((f: { sha256: string; upstreamSha256: string }) => /^[a-f0-9]{64}$/.test(f.sha256) && /^[a-f0-9]{64}$/.test(f.upstreamSha256))).toBe(true);
      if (format === "ts")
        expect(m.files.every((f: { sha256: string; upstreamSha256: string }) => f.sha256 === f.upstreamSha256)).toBe(true);
      expect(readFileSync(join(out, "LICENSE"), "utf8")).toContain("MIT");
      const verify = () =>
        spawnSync(process.execPath, [join(out, "verify-vendor.mjs")], { encoding: "utf8" });
      expect(verify().status).toBe(0);
      expect((await check(out)).ok).toBe(true);
      const entry = join(out, m.entry);
      const original = readFileSync(entry, "utf8");
      appendFileSync(entry, "\n// local edit\n");
      expect(verify().status).toBe(1);
      expect(verify().stderr).toContain(`modified: ${m.entry}`);
      expect((await check(out)).ok).toBe(false);
      writeFileSync(entry, original.replace(/\n/g, "\r\n"));
      expect(verify().status).toBe(0);
      writeFileSync(join(out, "extra.ts"), "export {};\n");
      expect(verify().stderr).toContain("unexpected: extra.ts");
      rmSync(join(out, "extra.ts"));
      expect(verify().status).toBe(0);
    });
  it("checks with its own verifier, never the copy's, and lists only Pi peers", async () => {
    const out = join(base, "tamper");
    const m = vendor({ out, format: "ts", date: "2026-11-23T00:00:00Z", allowDirty: true });
    expect(m.peerDependencies).toEqual({ "@earendil-works/pi-tui": expect.any(String) });
    expect(Object.keys(m.peerDependencies)).toEqual(m.externals);
    expect((await check(out)).ok).toBe(true);
    appendFileSync(join(out, "pi.ts"), "\n// local edit\n");
    const stub =
      'import { readFileSync } from "node:fs";\n' +
      "globalThis.__vendorStubRan = true;\n" +
      'export function verifyVendor(d) { return { ok: true, problems: [], manifest: JSON.parse(readFileSync(d + "/VENDOR.json", "utf8")) }; }\n';
    writeFileSync(join(out, "verify-vendor.mjs"), stub);
    for (const upstream of [false, true]) {
      const r = await check(out, { upstream });
      expect(r.ok).toBe(false);
      expect(r.problems).toContain("modified: pi.ts");
      expect(r.problems.some((p: string) => p.includes("verify-vendor.mjs"))).toBe(true);
    }
    expect((globalThis as { __vendorStubRan?: boolean }).__vendorStubRan).toBeUndefined();
    const cli = spawnSync(
      process.execPath,
      [resolve("scripts/vendor-terminal.mjs"), "--check", out],
      { encoding: "utf8" },
    );
    expect(cli.status).toBe(1);
    expect(cli.stderr).toContain("drift: modified: pi.ts");
  });
  it("imports the js copy with plain Node and renders through the real pi-tui", () => {
    const pi = pathToFileURL(join(base, "js", "pi.js")).href;
    const settings = pathToFileURL(join(base, "js", "settings.js")).href;
    const script = `
      const { PiSettingsPanel, piBindings } = await import(${JSON.stringify(pi)});
      const { SettingsSession } = await import(${JSON.stringify(settings)});
      const { getKeybindings, visibleWidth } = await import("@earendil-works/pi-tui");
      const s = new SettingsSession([{ id: "a", label: "Name", description: "d", kind: "text" }], { a: "x" });
      const p = new PiSettingsPanel({ title: "T", scope: "S", session: s, persist: async () => {}, locale: "en", presentation: "standard",
        bindings: piBindings(getKeybindings(), ["ctrl+c"], true, { locale: "en" }) }, { fg: (_n, t) => t }, () => {}, () => {}, () => 24);
      const lines = p.render(40);
      console.log(JSON.stringify({ ok: lines.every((l) => visibleWidth(l) <= 40), text: lines.join("\\n") }));`;
    const r = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
      encoding: "utf8",
      cwd: base,
    });
    expect(r.stderr).toBe("");
    const out = JSON.parse(r.stdout);
    expect(out.ok).toBe(true);
    expect(out.text).toContain("Save changes");
  });
});
