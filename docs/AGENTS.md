# Agentes

Núcleo comum: `@inteiro/agent-core` e MCP `@inteiro/mcp`.

Cada harness usa o mecanismo oficialmente documentado — não um plugin fictício universal.

| Harness | Mecanismo | Status |
|---|---|---|
| Codex | AGENTS.md, `.agents/skills`, Agent Plugins `plugin.json` / `.codex-plugin`, MCP | parcialmente testado |
| Claude Code | `.claude/skills`, `.claude-plugin/plugin.json`, `.mcp.json` | parcialmente testado |
| Devin | `.agents/skills`, playbook/knowledge markdown (web app é manual) | não verificado no app Devin |
| Cursor | AGENTS.md, `.cursor/rules/*.mdc`, skills, `.cursor-plugin`, MCP | parcialmente testado |
| Pi | AGENTS.md, `.pi/skills`, `.agents/skills` | parcialmente testado |
| Hermes | AGENTS.md (cwd), HERMES.md, Agent Plugins, MCP | não verificado no binário Hermes |

Fontes consultadas em outubro de 2026: developers.openai.com/codex, code.claude.com/docs, docs.devin.ai, cursor.com/docs, pi.dev/docs, hermes-agent.nousresearch.com, agent-plugins.org 1.0.0.

```bash
npx inteiro agents install cursor --yes
npx inteiro agents doctor
```

Automático após install: o harness descobre skills de entrada (`inteiro`, `inteiro-interface`, …). Consulta fina de tokens é sob demanda (CLI/MCP), não por milhares de skills no prompt.

No MCP, `inteiro_audit` é uma análise estática do texto-fonte e sinaliza padrões que podem quebrar texto ou cortar conteúdo. Para avaliar a interface renderizada, passe o inventário `routes[]` a `inteiro_get_visual_review`, percorra a matriz de viewports e estados, compare capturas e registre cada defeito com causa provável, ação, validação e reversão. O MCP não captura nem interpreta pixels; tokens, lint e diff não substituem a revisão humana.
