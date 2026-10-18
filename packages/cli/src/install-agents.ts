import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { exists, writeManaged as writeManagedRaw } from "./fsutil.ts";
import { getHarness, type HarnessId } from "./harnesses.ts";
import { frontmatter, topLevelSkills } from "./skills-gen.ts";
import { recordContextIntegrity } from "@inteiro/agent-core";

export interface InstallReport {
  harness: string;
  actions: string[];
  status?: "passed" | "needs_review";
}

function repoRoot(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
}
function mcpServerPath(): string {
  try {
    const manifest = createRequire(import.meta.url).resolve(
      "@inteiro/mcp/package.json",
    );
    const dir = dirname(manifest);
    const built = join(dir, "runtime", "server.js");
    return existsSync(built) ? built : join(dir, "src", "server.ts");
  } catch {
    return join(repoRoot(), "packages", "mcp", "src", "server.ts");
  }
}

function managed(path: string): string {
  return `<!-- inteiro-managed:${path} -->\n`;
}

async function writeSkillDir(
  base: string,
  opts: { dryRun: boolean; yes: boolean },
  writer: (
    path: string,
    contents: string,
    opts: { dryRun: boolean; yes: boolean },
  ) => Promise<string> = writeManagedRaw,
): Promise<string[]> {
  const actions: string[] = [];
  for (const skill of topLevelSkills()) {
    const path = join(base, skill.name, "SKILL.md");
    const st = await writer(path, frontmatter(skill), opts);
    actions.push(`${st} ${path}`);
  }
  return actions;
}

function mcpJson(): string {
  return (
    JSON.stringify(
      {
        $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
        mcpServers: {
          inteiro: {
            type: "stdio",
            command: "node",
            args: [mcpServerPath()],
          },
        },
      },
      null,
      2,
    ) + "\n"
  );
}

export async function installHarness(
  cwd: string,
  id: HarnessId,
  opts: { dryRun: boolean; yes: boolean },
): Promise<InstallReport> {
  const harness = getHarness(id);
  const actions: string[] = [];
  const root = repoRoot();
  const conflicts: string[] = [];
  const writeManaged = async (
    path: string,
    contents: string,
    options: { dryRun: boolean; yes: boolean },
  ) => {
    const current = await readFile(path, "utf8").catch(() => undefined);
    if (
      current === undefined ||
      current === contents ||
      path.endsWith("AGENTS.md") ||
      path.endsWith(".installed.json")
    )
      return writeManagedRaw(path, contents, options);
    if (path.endsWith(".json")) {
      try {
        const old = JSON.parse(current),
          next = JSON.parse(contents);
        if (old.name && next.name && old.name !== next.name)
          throw new Error("Conflicting plugin identity");
        if (
          old.mcpServers?.inteiro &&
          next.mcpServers?.inteiro &&
          JSON.stringify(old.mcpServers.inteiro) !==
            JSON.stringify(next.mcpServers.inteiro)
        )
          throw new Error("Conflicting MCP server");
        const merged = {
          ...old,
          ...next,
          ...(next.mcpServers
            ? { mcpServers: { ...old.mcpServers, ...next.mcpServers } }
            : {}),
        };
        return writeManagedRaw(path, JSON.stringify(merged, null, 2) + "\n", {
          ...options,
          yes: true,
        });
      } catch {
        /* Preserve conflicting or invalid consumer-owned JSON. */
      }
    }
    conflicts.push(path);
    return "conflict-preserved";
  };

  if (["pi", "codex", "cursor", "hermes"].includes(id)) {
    const agentPath = join(cwd, "AGENTS.md");
    const current = await readFile(agentPath, "utf8").catch(() => "");
    const block =
      '<!-- inteiro:context:start -->\n## INTEIRO context gate\nResolve context before UI edits: `npx inteiro context resolve --task "description" --json`; select --harness when not configured.\nValidate using `npx inteiro gate run --profile pr --json`. No baseline self-approval.\n<!-- inteiro:context:end -->';
    const next = current.includes("<!-- inteiro:context:start -->")
      ? current.replace(
          /<!-- inteiro:context:start -->[\s\S]*?<!-- inteiro:context:end -->/,
          block,
        )
      : current.trimEnd() + "\n\n" + block + "\n";
    actions.push(await writeManaged(agentPath, next, { ...opts, yes: true }));
  }

  const copySkill = async (dir: string) => {
    actions.push(...(await writeSkillDir(dir, opts, writeManaged)));
  };

  if (id === "codex") {
    await copySkill(join(cwd, ".agents", "skills"));
    const plugin = {
      $schema: "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
      name: "inteiro",
      version: "1.2.0",
      description: "INTEIRO Identity Design System for Codex",
      license: "MIT",
      keywords: ["design-system", "inteiro", "tokens"],
    };
    actions.push(
      await writeManaged(
        join(cwd, "plugin.json"),
        JSON.stringify(plugin, null, 2) + "\n",
        opts,
      ),
    );
    actions.push(
      await writeManaged(
        join(cwd, ".codex-plugin", "plugin.json"),
        JSON.stringify(
          {
            name: "inteiro",
            version: "1.2.0",
            description: "INTEIRO for Codex",
            skills: "./.agents/skills/",
            mcpServers: "mcp.json",
          },
          null,
          2,
        ) + "\n",
        opts,
      ),
    );
    actions.push(await writeManaged(join(cwd, "mcp.json"), mcpJson(), opts));
  }

  if (id === "claude") {
    await copySkill(join(cwd, ".claude", "skills"));
    actions.push(
      await writeManaged(
        join(cwd, ".claude-plugin", "plugin.json"),
        JSON.stringify(
          {
            name: "inteiro",
            displayName: "INTEIRO",
            version: "1.2.0",
            description: "Identity Design System INTEIRO",
            author: { name: "INTEIRO" },
            license: "MIT",
            keywords: ["design-system", "tokens"],
          },
          null,
          2,
        ) + "\n",
        opts,
      ),
    );
    actions.push(
      await writeManaged(
        join(cwd, ".mcp.json"),
        JSON.stringify(
          {
            mcpServers: {
              inteiro: { command: "node", args: [mcpServerPath()] },
            },
          },
          null,
          2,
        ) + "\n",
        opts,
      ),
    );
  }

  if (id === "devin") {
    await copySkill(join(cwd, ".agents", "skills"));
    actions.push(
      await writeManaged(
        join(cwd, ".devin", "playbooks", "inteiro.md"),
        `# Playbook INTEIRO\n\nMacro sugerido: !inteiro\n\n${frontmatter(topLevelSkills()[0]!)}\n`,
        opts,
      ),
    );
    actions.push(
      await writeManaged(
        join(cwd, ".devin", "knowledge", "inteiro.md"),
        `# Knowledge INTEIRO\n\nTrigger: implementing UI, CSS, components, design tokens, brand, accessibility.\n\n${frontmatter(topLevelSkills()[0]!)}\n`,
        opts,
      ),
    );
  }

  if (id === "cursor") {
    await copySkill(join(cwd, ".cursor", "skills"));
    await copySkill(join(cwd, ".agents", "skills"));
    actions.push(
      await writeManaged(
        join(cwd, ".cursor", "rules", "inteiro.mdc"),
        `---
description: INTEIRO Identity Design System — regras sempre aplicáveis em UI.
globs: **/*.{css,scss,html,tsx,jsx,vue,svelte}
alwaysApply: false
---

${topLevelSkills()[0]!.body}
`,
        opts,
      ),
    );
    actions.push(
      await writeManaged(
        join(cwd, ".cursor-plugin", "plugin.json"),
        JSON.stringify(
          {
            name: "inteiro",
            version: "1.2.0",
            description: "INTEIRO Cursor plugin",
            skills: "./.cursor/skills",
            rules: "./.cursor/rules",
          },
          null,
          2,
        ) + "\n",
        opts,
      ),
    );
    actions.push(
      await writeManaged(
        join(cwd, "plugin.json"),
        JSON.stringify(
          {
            $schema:
              "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
            name: "inteiro",
            version: "1.2.0",
            description: "INTEIRO Agent Plugin",
            license: "MIT",
          },
          null,
          2,
        ) + "\n",
        opts,
      ),
    );
    actions.push(
      await writeManaged(
        join(cwd, ".cursor", "mcp.json"),
        JSON.stringify(
          {
            mcpServers: {
              inteiro: { command: "node", args: [mcpServerPath()] },
            },
          },
          null,
          2,
        ) + "\n",
        opts,
      ),
    );
  }

  if (id === "pi") {
    await copySkill(join(cwd, ".pi", "skills"));
    await copySkill(join(cwd, ".agents", "skills"));
  }

  if (id === "hermes") {
    await copySkill(join(cwd, ".agents", "skills"));
    actions.push(
      await writeManaged(
        join(cwd, "HERMES.md"),
        `# INTEIRO\n\n${topLevelSkills()[0]!.body}\n`,
        opts,
      ),
    );
    actions.push(
      await writeManaged(
        join(cwd, ".hermes-plugin", "plugin.json"),
        JSON.stringify(
          {
            $schema:
              "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
            name: "inteiro",
            version: "1.2.0",
            license: "MIT",
          },
          null,
          2,
        ) + "\n",
        opts,
      ),
    );
  }

  const markerFile = join(cwd, ".inteiro", `${id}.installed.json`);
  actions.push(
    await writeManaged(
      markerFile,
      JSON.stringify(
        {
          harness: id,
          version: "1.2.0",
          mechanism: harness.mechanism,
          verified: harness.verified,
          sources: harness.sources,
          schemaVersion: "1.0",
          conflicts,
        },
        null,
        2,
      ) + "\n",
      { ...opts, yes: true },
    ),
  );

  if (!opts.dryRun) await recordContextIntegrity(cwd, id);
  return {
    harness: id,
    actions,
    status: conflicts.length ? "needs_review" : "passed",
  };
}

export async function uninstallHarness(
  cwd: string,
  id: HarnessId,
  opts: { dryRun: boolean; yes: boolean },
): Promise<InstallReport> {
  getHarness(id);
  const actions: string[] = [];
  const marker = join(cwd, ".inteiro", `${id}.installed.json`);
  if (opts.dryRun) return { harness: id, actions: [`would-remove ${marker}`] };
  if (await exists(marker)) {
    await rm(marker, { force: true });
    actions.push(`removed ${marker}`);
  } else actions.push("nada gerenciado encontrado");
  actions.push(
    "Skills em .agents/.claude/.cursor não são apagadas automaticamente para preservar customizações. Remova as pastas inteiro* manualmente se desejar.",
  );
  return { harness: id, actions };
}

void dirname;
void readFile;
void mkdir;
void writeFile;
void managed;
