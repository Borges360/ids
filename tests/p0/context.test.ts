import { describe, it, expect } from "vitest";
import { mkdtemp, readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DEFAULTS } from "@inteiro/contracts";
import {
  verifyContext,
  resolveContext,
} from "../../packages/agent-core/src/context.ts";
import { installHarness } from "../../packages/cli/src/install-agents.ts";
it('Codex context-only installation preserves another plugin identity and verifies skills', async () => {
  const root = await mkdtemp(join(tmpdir(), 'inteiro-shared-plugin-'));
  try {
    await mkdir(join(root, '.codex-plugin'), { recursive: true });
    const plugin = JSON.stringify({ name: 'harness', skills: './.agents/skills' });
    await writeFile(join(root, '.codex-plugin/plugin.json'), plugin);
    const result = await installHarness(root, 'codex', { dryRun: false, yes: true, contextOnly: true });
    expect(result.status).toBe('passed');
    expect(await readFile(join(root, '.codex-plugin/plugin.json'), 'utf8')).toBe(plugin);
    const config = structuredClone(DEFAULTS);
    config.context.harness = 'codex';
    expect((await verifyContext(root, config)).status).toBe('passed');
    await expect(readFile(join(root, 'mcp.json'))).rejects.toThrow();
    await expect(readFile(join(root, 'plugin.json'))).rejects.toThrow();
  } finally { await rm(root, { recursive: true, force: true }); }
});
describe("P0 harness integration evidence", () => {
  it('preserves conflicting consumer skills and reports the conflict',async()=>{
    const root=await mkdtemp(join(tmpdir(),'inteiro-conflict-'));try{await mkdir(join(root,'.pi/skills/inteiro'),{recursive:true});const path=join(root,'.pi/skills/inteiro/SKILL.md');await writeFile(path,'User-owned customized skill');const result=await installHarness(root,'pi',{dryRun:false,yes:true});expect(result.status).toBe('needs_review');expect(await readFile(path,'utf8')).toBe('User-owned customized skill');const config=structuredClone(DEFAULTS);config.context.harness='pi';expect((await verifyContext(root,config)).status).toBe('blocked');}finally{await rm(root,{recursive:true,force:true});}
  });
  for (const harness of [
    "pi",
    "codex",
    "cursor",
    "claude",
    "devin",
    "hermes",
  ] as const)
    it(
      harness + " installs idempotently and exposes observable limits",
      async () => {
        const root = await mkdtemp(join(tmpdir(), "inteiro-context-"));
        try {
          await writeFile(
            join(root, "AGENTS.md"),
            "# Existing custom instructions\n",
          );
          await installHarness(root, harness, { dryRun: false, yes: true });
          const before = await readFile(join(root, "AGENTS.md"), "utf8");
          await installHarness(root, harness, { dryRun: false, yes: true });
          expect(await readFile(join(root, "AGENTS.md"), "utf8")).toBe(before);
          expect(before).toContain("Existing custom instructions");
          const config = structuredClone(DEFAULTS);
          config.context.harness = harness;
          const verified = await verifyContext(root, config);
          expect(verified.status, JSON.stringify(verified)).toBe("passed");
          expect(verified.loaded).toBe("unobserved");
          const context = await resolveContext(
            { type: "component", description: "tabela table" },
            root,
            config,
          );
          expect(context.status).toBe("passed");
          expect(context.estimatedTokens).toBeLessThanOrEqual(4000);
          expect(context.patterns.length).toBeGreaterThan(0);
          if (["pi", "codex", "cursor", "hermes"].includes(harness)) {
            await writeFile(join(root, "AGENTS.md"), "# Altered");
            expect((await verifyContext(root, config)).status).toBe("blocked");
          }
        } finally {
          await rm(root, { recursive: true, force: true });
        }
      },
    );
  it("isolates configurations and context hashes for apps", async () => {
    const roots = await Promise.all([
      mkdtemp(join(tmpdir(), "inteiro-a-")),
      mkdtemp(join(tmpdir(), "inteiro-b-")),
    ]);
    try {
      const configs = roots.map((_, i) => ({
        ...structuredClone(DEFAULTS),
        project: { ...DEFAULTS.project, id: "app-" + i },
      }));
      const bundles = await Promise.all(
        roots.map((r, i) =>
          resolveContext(
            { type: "component", description: "tabela" },
            r,
            configs[i]!,
          ),
        ),
      );
      expect(bundles[0]!.configHash).not.toBe(bundles[1]!.configHash);
    } finally {
      for (const root of roots)
        await rm(root, { recursive: true, force: true });
    }
  });
});
