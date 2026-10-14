import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { exists, writeManaged } from "./fsutil.ts";
import { getHarness, type HarnessId } from "./harnesses.ts";
import { frontmatter, topLevelSkills } from "./skills-gen.ts";

export interface InstallReport {
  harness: string;
  actions: string[];
}

function repoRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
}

function managed(path: string): string {
  return `<!-- inteiro-managed:${path} -->\n`;
}

async function writeSkillDir(base: string, opts: { dryRun: boolean; yes: boolean }): Promise<string[]> {
  const actions: string[] = [];
  for (const skill of topLevelSkills()) {
    const path = join(base, skill.name, "SKILL.md");
    const st = await writeManaged(path, frontmatter(skill), opts);
    actions.push(`${st} ${path}`);
  }
  return actions;
}

function mcpJson(): string {
  return JSON.stringify({
    $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
    mcpServers: {
      inteiro: {
        type: "stdio",
        command: "node",
        args: [join(repoRoot(), "packages", "mcp", "src", "server.ts")]
      }
    }
  }, null, 2) + "\n";
}

export async function installHarness(cwd: string, id: HarnessId, opts: { dryRun: boolean; yes: boolean }): Promise<InstallReport> {
  const harness = getHarness(id);
  const actions: string[] = [];
  const root = repoRoot();

  const copySkill = async (dir: string) => {
    actions.push(...(await writeSkillDir(dir, opts)));
  };

  if (id === "codex") {
    await copySkill(join(cwd, ".agents", "skills"));
    const plugin = {
      $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
      name: "inteiro",
      version: "1.1.0",
      description: "INTEIRO Identity Design System for Codex",
      license: "MIT",
      keywords: ["design-system", "inteiro", "tokens"]
    };
    actions.push(await writeManaged(join(cwd, "plugin.json"), JSON.stringify(plugin, null, 2) + "\n", opts));
    actions.push(await writeManaged(join(cwd, ".codex-plugin", "plugin.json"), JSON.stringify({
      name: "inteiro",
      version: "1.1.0",
      description: "INTEIRO for Codex",
      skills: "./.agents/skills/",
      mcpServers: "mcp.json"
    }, null, 2) + "\n", opts));
    actions.push(await writeManaged(join(cwd, "mcp.json"), mcpJson(), opts));
  }

  if (id === "claude") {
    await copySkill(join(cwd, ".claude", "skills"));
    actions.push(await writeManaged(join(cwd, ".claude-plugin", "plugin.json"), JSON.stringify({
      name: "inteiro",
      displayName: "INTEIRO",
      version: "1.1.0",
      description: "Identity Design System INTEIRO",
      author: { name: "INTEIRO" },
      license: "MIT",
      keywords: ["design-system", "tokens"]
    }, null, 2) + "\n", opts));
    actions.push(await writeManaged(join(cwd, ".mcp.json"), JSON.stringify({
      mcpServers: {
        inteiro: { command: "node", args: [join(root, "packages", "mcp", "src", "server.ts")] }
      }
    }, null, 2) + "\n", opts));
  }

  if (id === "devin") {
    await copySkill(join(cwd, ".agents", "skills"));
    actions.push(await writeManaged(join(cwd, ".devin", "playbooks", "inteiro.md"), `# Playbook INTEIRO\n\nMacro sugerido: !inteiro\n\n${frontmatter(topLevelSkills()[0]!)}\n`, opts));
    actions.push(await writeManaged(join(cwd, ".devin", "knowledge", "inteiro.md"), `# Knowledge INTEIRO\n\nTrigger: implementing UI, CSS, components, design tokens, brand, accessibility.\n\n${frontmatter(topLevelSkills()[0]!)}\n`, opts));
  }

  if (id === "cursor") {
    await copySkill(join(cwd, ".cursor", "skills"));
    await copySkill(join(cwd, ".agents", "skills"));
    actions.push(await writeManaged(join(cwd, ".cursor", "rules", "inteiro.mdc"), `---
description: INTEIRO Identity Design System — regras sempre aplicáveis em UI.
globs: **/*.{css,scss,html,tsx,jsx,vue,svelte}
alwaysApply: false
---

${topLevelSkills()[0]!.body}
`, opts));
    actions.push(await writeManaged(join(cwd, ".cursor-plugin", "plugin.json"), JSON.stringify({
      name: "inteiro",
      version: "1.1.0",
      description: "INTEIRO Cursor plugin",
      skills: "./.cursor/skills",
      rules: "./.cursor/rules"
    }, null, 2) + "\n", opts));
    actions.push(await writeManaged(join(cwd, "plugin.json"), JSON.stringify({
      $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
      name: "inteiro",
      version: "1.1.0",
      description: "INTEIRO Agent Plugin",
      license: "MIT"
    }, null, 2) + "\n", opts));
    actions.push(await writeManaged(join(cwd, ".cursor", "mcp.json"), JSON.stringify({
      mcpServers: {
        inteiro: { command: "node", args: [join(root, "packages", "mcp", "src", "server.ts")] }
      }
    }, null, 2) + "\n", opts));
  }

  if (id === "pi") {
    await copySkill(join(cwd, ".pi", "skills"));
    await copySkill(join(cwd, ".agents", "skills"));
  }

  if (id === "hermes") {
    await copySkill(join(cwd, ".agents", "skills"));
    actions.push(await writeManaged(join(cwd, "HERMES.md"), `# INTEIRO\n\n${topLevelSkills()[0]!.body}\n`, opts));
    actions.push(await writeManaged(join(cwd, ".hermes-plugin", "plugin.json"), JSON.stringify({
      $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
      name: "inteiro",
      version: "1.1.0",
      license: "MIT"
    }, null, 2) + "\n", opts));
  }

  const markerFile = join(cwd, ".inteiro", `${id}.installed.json`);
  actions.push(await writeManaged(markerFile, JSON.stringify({
    harness: id,
    version: "1.1.0",
    mechanism: harness.mechanism,
    verified: harness.verified,
    sources: harness.sources,
    installedAt: new Date().toISOString()
  }, null, 2) + "\n", { ...opts, yes: true }));

  return { harness: id, actions };
}

export async function uninstallHarness(cwd: string, id: HarnessId, opts: { dryRun: boolean; yes: boolean }): Promise<InstallReport> {
  getHarness(id);
  const actions: string[] = [];
  const marker = join(cwd, ".inteiro", `${id}.installed.json`);
  if (opts.dryRun) return { harness: id, actions: [`would-remove ${marker}`] };
  if (await exists(marker)) {
    await rm(marker, { force: true });
    actions.push(`removed ${marker}`);
  } else actions.push("nada gerenciado encontrado");
  actions.push("Skills em .agents/.claude/.cursor não são apagadas automaticamente para preservar customizações. Remova as pastas inteiro* manualmente se desejar.");
  return { harness: id, actions };
}

void dirname;
void readFile;
void mkdir;
void writeFile;
void managed;
