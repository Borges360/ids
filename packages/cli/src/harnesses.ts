export type HarnessId = "codex" | "claude" | "devin" | "cursor" | "pi" | "hermes";

export interface HarnessInfo {
  id: HarnessId;
  name: string;
  mechanism: string;
  installTargets: string[];
  discovery: string;
  sources: string[];
  verified: "tested" | "partially-tested" | "not-verified";
  notes: string;
}

export const HARNESSES: HarnessInfo[] = [
  {
    id: "codex",
    name: "OpenAI Codex",
    mechanism: "AGENTS.md + Agent Skills (.agents/skills) + Agent Plugins (plugin.json) + MCP",
    installTargets: ["AGENTS.md", ".agents/skills/", "plugin.json", ".codex-plugin/plugin.json", "mcp.json"],
    discovery: "Skills em .agents/skills e $HOME/.agents/skills. AGENTS.md global em ~/.codex e por diretório no repo. Plugins via plugin.json / .codex-plugin/plugin.json.",
    sources: [
      "https://developers.openai.com/codex/guides/agents-md",
      "https://developers.openai.com/codex/skills",
      "https://developers.openai.com/plugins/build/plugins",
      "https://agent-plugins.org/specification"
    ],
    verified: "partially-tested",
    notes: "Instalação local de arquivos e marketplace simulada. Publicação no directory da OpenAI não é feita."
  },
  {
    id: "claude",
    name: "Claude Code",
    mechanism: "Skills em .claude/skills ou plugin .claude-plugin/plugin.json + .mcp.json",
    installTargets: [".claude/skills/", ".claude-plugin/plugin.json", ".mcp.json"],
    discovery: "Skills de projeto em .claude/skills/<name>/SKILL.md; pessoais em ~/.claude/skills. Plugin carrega skills/ no root do plugin.",
    sources: [
      "https://code.claude.com/docs/en/skills",
      "https://code.claude.com/docs/en/plugins.md",
      "https://code.claude.com/docs/en/plugins-reference"
    ],
    verified: "partially-tested",
    notes: "Manifesto plugin.json escrito conforme a referência. claude plugin validate não é executado se o CLI Claude não estiver instalado."
  },
  {
    id: "devin",
    name: "Devin",
    mechanism: "Skills (.agents/skills) + Playbooks (web) + Knowledge + Plugins",
    installTargets: [".agents/skills/", ".devin/playbooks/", ".devin/knowledge/"],
    discovery: "Devin descobre SKILL.md em .agents/skills. Playbooks e Knowledge de org vivem na web app; o adaptador gera markdown copiável.",
    sources: [
      "https://docs.devin.ai/product-guides/skills",
      "https://docs.devin.ai/product-guides/creating-playbooks",
      "https://docs.devin.ai/product-guides/knowledge",
      "https://docs.devin.ai/product-guides/plugins"
    ],
    verified: "not-verified",
    notes: "Sem API pública para gravar Playbooks na web app. Entrega arquivos de repositório e cópia para colar."
  },
  {
    id: "cursor",
    name: "Cursor",
    mechanism: "AGENTS.md + .cursor/rules/*.mdc + Skills (.cursor/skills e .agents/skills) + Cursor Plugins + MCP",
    installTargets: ["AGENTS.md", ".cursor/rules/", ".cursor/skills/", ".agents/skills/", ".cursor-plugin/plugin.json", ".cursor/mcp.json"],
    discovery: "Rules .mdc com frontmatter. Skills em .cursor/skills e .agents/skills. Plugins: plugin.json (Agent Plugins) e .cursor-plugin/plugin.json.",
    sources: [
      "https://cursor.com/docs/rules",
      "https://cursor.com/docs/skills",
      "https://cursor.com/docs/plugins.md",
      "https://cursor.com/docs/reference/plugins"
    ],
    verified: "partially-tested",
    notes: "Arquivos de projeto verificados em ambiente simulado. Marketplace Cursor não é publicado."
  },
  {
    id: "pi",
    name: "Pi Coding Agent",
    mechanism: "AGENTS.md + Skills (.pi/skills, .agents/skills, ~/.pi/agent/skills) + Pi Packages",
    installTargets: ["AGENTS.md", ".pi/skills/", ".agents/skills/"],
    discovery: "Pi concatena AGENTS.md/CLAUDE.md. Skills Agent Skills standard; comando /skill:name.",
    sources: [
      "https://pi.dev/docs/latest/skills",
      "https://github.com/mariozechner/pi-mono",
      "https://www.npmjs.com/package/@mariozechner/pi-coding-agent"
    ],
    verified: "partially-tested",
    notes: "Instalação de arquivos de projeto. Pi package npm não é publicado."
  },
  {
    id: "hermes",
    name: "Hermes Agent",
    mechanism: "AGENTS.md (cwd) + HERMES.md/.hermes.md + skills_list/skill_view + Agent Plugins + MCP em ~/.hermes/config.yaml",
    installTargets: ["AGENTS.md", "HERMES.md", ".agents/skills/", ".hermes-plugin/"],
    discovery: "AGENTS.md apenas no cwd. HERMES.md hierárquico até o git root. Skills portáteis via plugin ou hermes skills install.",
    sources: [
      "https://hermes-agent.nousresearch.com/docs/user-guide/features/skills",
      "https://hermes-agent.nousresearch.com/docs/developer-guide/plugins",
      "https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp"
    ],
    verified: "not-verified",
    notes: "Plugin Python nativo de ~/.hermes/plugins/ não é instalado automaticamente. Entrega Agent Plugin portátil + HERMES.md + skills."
  }
];

export function getHarness(id: string): HarnessInfo {
  const found = HARNESSES.find((h) => h.id === id);
  if (!found) throw new Error(`Harness desconhecido: ${id}`);
  return found;
}
