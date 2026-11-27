# INTEIRO — Especificação técnica de evolução P0

**Design Contracts · Implementation Guardrails · Visual Acceptance · Agent Integration · Evaluation**  
**Identificador:** INTEIRO-RFC-001  
**Versão do documento:** 1.0.0  
**Data:** 18 de outubro de 2026  
**Estado:** Especificação proposta, pronta para decomposição em tarefas de engenharia  
**Prioridade:** P0 para todos os requisitos  
**Base analisada:** INTEIRO 1.1.0, repositório público `Borges360/ids` (`main`)  
**Público-alvo:** mantenedores do IDS, desenvolvedores de SDK/CLI, frontend, QA, plataforma e agentes de programação.

> **Tese:** O INTEIRO deve deixar de ser somente um contrato consultável e tornar-se um sistema verificável de produção de interfaces. Modelos leves podem implementar UI com confiabilidade superior quando recebem composições restritas, contratos executáveis, feedback do navegador e gates independentes do julgamento do próprio modelo.

## 0. Decisões executivas

1. **Todos os épicos deste documento são P0.** A ordem de execução abaixo indica dependências, nunca rebaixamento de prioridade.
2. **Preservar o núcleo framework-agnostic.** Tokens DTCG, contratos JSON, CSS, CLI, protocolos e artefatos de validação não devem depender de React ou de um harness específico.
3. **Não substituir nem duplicar o que já funciona.** Reutilizar `@inteiro/tokens`, `@inteiro/agent-core`, `@inteiro/cli`, `@inteiro/mcp`, `@inteiro/design-system`, adaptadores existentes e o protocolo `inteiro_get_visual_review`.
4. **Aprovação final não pode depender da autoavaliação da LLM.** Uma conclusão `passed` exige evidências dos gates e baselines aprovadas; revisão estética sem referência permanece explicitamente sujeita a humano ou modelo multimodal, com trilha de auditoria.
5. **Ausência de evidência não equivale a sucesso.** Em modo de CI estrito, rota crítica descoberta sem testes, baseline pendente, navegador indisponível e agente desconectado devem resultar em falha ou bloqueio tipificado.
6. **Não aumentar tokens por quantidade.** Adicionar tokens somente se houver uma decisão semântica estável e reutilizável não expressável pelo catálogo; preferir componentes, templates e regras antes de inventar valores.
7. **Offline-first, provider-neutral.** Auditoria estática, catálogo, renderização e comparação básica rodam localmente sem LLM; revisão multimodal é um adaptador opcional de execução quando a política exigir, com alternativa humana.
8. **A superfície P0 web é HTML/CSS/JS + React/Next, Vue e Svelte por contratos compartilhados.** Flutter/Swift continuam com exports de tokens, sem prometer que Playwright cobre renderização nativa.

## 1. Diagnóstico do estado atual (AS-IS)

### 1.1 Evidências verificadas

A documentação pública informa: INTEIRO 1.1.0, catálogo de 316 tokens DTCG em três camadas, variantes de tema `dark/light`, densidades `calm/focus`, CLI (`init`, `doctor`, `audit`, `agents`, etc.), servidor MCP stdio, adaptadores para Codex/Claude/Devin/Cursor/Pi/Hermes e catálogo de dez skills de entrada. As classes CSS expostas cobrem botão, campo, card, badge e vozes; `dialog`, `table`, `navigation`, `app-shell`, `empty-state` e outros estão majoritariamente em formato *recipe*, não como implementação reutilizável completa.

O relatório de validação da release de 13/10/2026 declara typecheck, build e testes bem-sucedidos, ao mesmo tempo em que registra expressamente a **ausência de suíte automática de regressão por screenshots** e de aprovação visual de aplicação. O MCP `inteiro_get_visual_review` fornece um protocolo/checklist, não uma certificação automática do resultado renderizado. A documentação de agentes declara várias integrações como parcialmente testadas.

**Fontes do estado atual:**
- [Repositório e README](https://github.com/Borges360/ids)
- [Arquitetura](https://github.com/Borges360/ids/blob/main/docs/ARCHITECTURE.md)
- [Componentes](https://github.com/Borges360/ids/blob/main/docs/COMPONENTS.md)
- [Agentes](https://github.com/Borges360/ids/blob/main/docs/AGENTS.md)
- [Skills](https://github.com/Borges360/ids/blob/main/docs/SKILLS.md)
- [Relatório de validação](https://github.com/Borges360/ids/blob/main/docs/VALIDATION_REPORT.md)

**Limite desta análise:** a inspeção foi documental, por arquivos públicos renderizados do repositório; não houve clone local, execução dos testes ou auditoria linha a linha de todo o código. Os caminhos novos deste RFC são **propostos**, não alegações de implementação atual. O primeiro passo da execução deve inventariar arquivos e APIs reais antes de criar pacotes.

### 1.2 Lacunas e riscos

| ID | Lacuna | Causa estrutural | Efeito | Resolução P0 |
|---|---|---|---|---|
| GAP-01 | Skills podem não ser efetivamente consultadas | Descoberta sob demanda e diferenças entre harnesses | Código gerado sem contexto aplicável | Context Gate com prova de instalação, resolução e uso |
| GAP-02 | Recipes exigem interpretação extensa | Ausência de componente/padrão executável para casos frequentes | Drift entre telas e frameworks | Composition Kit + contratos semânticos |
| GAP-03 | Auditoria predominantemente estática | Fonte diferente de comportamento renderizado | Build correto, UI quebrada | Browser Gate com Playwright |
| GAP-04 | Sem baseline aprovada obrigatória | Protocolo visual sem lifecycle fechado | Regressão indetectável ou baseline ruim normalizada | Baseline Registry e aprovação explícita |
| GAP-05 | Poucas restrições enforceable | Regras textuais da identidade | Hardcodes, imports conflitantes, APIs inconsistentes | Lint/AST/CSS + policy engine |
| GAP-06 | Catálogo visual incompleto | Demo ≠ matriz abrangente de estados | Modelos não têm exemplos concretos | Story catalog e matrizes de stories |
| GAP-07 | Correção de IA sem feedback normalizado | Erros heterogêneos, contexto excessivo | Loops e custo maior | Feedback Envelope e Repair Controller |
| GAP-08 | Ausência de avaliação comparável por modelo | Não há dataset e runner do IDS | Seleção de LLM por impressão | Benchmark local reprodutível |
| GAP-09 | Falta governança de revisão subjetiva | Sem trilha para avaliação estética | Aprovação opaca | Review Gate humano/multimodal |

## 2. Objetivo, escopo e princípios

### 2.1 Objetivo mensurável

Permitir que um agente gere ou altere interfaces de aplicações que adotam o INTEIRO e produza um **pacote de evidências reexecutável** demonstrando conformidade estrutural, semântica, comportamental, responsiva e visual, com feedback de correção conciso e rastreável. O sucesso não é definido por “tela bonita”, mas por critérios verificáveis e decisão estética aprovada quando relevante.

### 2.2 Requisitos funcionais macro

| Épico | Nome | Saída principal | Prioridade |
|---|---|---|---|
| E00 | Foundation & Contracts | Esquemas, política, CLI e report model | P0 |
| E01 | Context Gate | Detecção e prova de integração por harness | P0 |
| E02 | Composition Kit | Padrões/componentes executáveis e exemplos | P0 |
| E03 | Static Guard | Regras AST/CSS, diagnósticos e autofix seguro | P0 |
| E04 | Browser & Visual Gate | Fluxos, screenshots, comportamento, responsividade e a11y | P0 |
| E05 | Baseline Governance | Registro de imagens, revisão e promoção controlada | P0 |
| E06 | Visual Catalog | Stories por componente/estado, teste e documentação | P0 |
| E07 | Agent Repair Protocol | Resultado estruturado e correção limitada | P0 |
| E08 | Multimodal/Human Review | Revisão qualitativa controlada | P0 |
| E09 | Evaluation & Benchmark | Dataset, execução e métricas de qualidade/custo | P0 |
| E10 | CI, Security & Adoption | Integração, migração, observabilidade e políticas | P0 |

### 2.3 Fora do escopo e limitações explícitas

Não desenvolver gerador universal de layouts com autonomia irrestrita; não criar framework de frontend novo; não converter o INTEIRO em biblioteca React obrigatória; não prometer classificação estética objetiva universal; não integrar obrigatoriamente um provedor de IA; não realizar testes visuais nativos de Flutter/Swift via Playwright; não substituir testes funcionais de negócio existentes. Recursos classificados P0 podem ser desenvolvidos em incrementos, mas a versão-alvo só é considerada pronta quando todos cumprirem suas condições de aceite.

### 2.4 Princípios de implementação

**Determinismo onde possível.** Toda violação comprovável por AST, CSS, DOM ou navegador deve ser diagnosticada sem LLM. **Progressive disclosure.** Recuperar do catálogo somente os padrões necessários à tarefa. **Composição controlada.** Preferir instâncias de padrões existentes a reinvenção. **Compatibilidade retroativa.** Preservar o comando atual `inteiro audit` e os identificadores de token existentes. **Sem aprovação por ausência.** Sem baseline, sem testes ou sem conectividade exigida, não reportar `passed`. **Leveza.** Core sem navegador e sem frameworks, dependências pesadas como devDependency opcional/instalada no workspace consumidor.

## 3. Arquitetura-alvo (TO-BE)

```text
                 Requisitos do usuário / issue / agente
                                 │
                         ┌───────▼────────┐
                         │ INTEIRO Context│  <- assets, tokens, recipes,
                         │ Gate / Contract│     composition manifest
                         └───────┬────────┘
                                 │ contrato compacto + seleção de padrão
                         ┌───────▼────────┐
                         │ Implementação  │  <- Pi / Cursor / Codex / outro
                         │ pela LLM       │
                         └───────┬────────┘
                                 │ diff do projeto
                  ┌──────────────▼───────────────┐
                  │ Static Gate (AST/CSS/Policy) │
                  └──────────────┬───────────────┘
                                 │
                  ┌──────────────▼───────────────┐
                  │ Browser Gate (Playwright)    │
                  │ flows, DOM, a11y, screenshot │
                  └──────────────┬───────────────┘
                                 │
                  ┌──────────────▼───────────────┐
                  │ Baseline Registry & Review   │
                  └──────────────┬───────────────┘
                           ┌─────┴──────┐
                        aprovado     falha/review
                           │             │
                    Evidence Bundle   Repair Envelope
                           │             │
                       concluído    até N tentativas -> revisão
```

### 3.1 Organização de pacotes — proposta de referência

Preservar as áreas reais. Criar novas estruturas somente após checar conflito de nomes e custo de manutenção:

```text
packages/
  contracts/              # NOVO: JSON Schema, types, policies, report schema
  composition/            # NOVO: manifesto de padrões e CSS agnóstico
  lint/                   # NOVO: rules TS/JS + CSS/PostCSS, CLI wrappers
  visual/                 # NOVO: orquestrador Playwright e comparador
  evaluation/             # NOVO: benchmark runner, dataset, stats
  agent-core/             # EXISTENTE: passa a expor context/feedback
  cli/                    # EXISTENTE: novas subcommands
  mcp/                    # EXISTENTE: ferramentas novas, stdio
  design-system/          # EXISTENTE: classes e padrões CSS
  adapter-*/              # EXISTENTES: integração por harness
apps/
  demo/                   # EXISTENTE: migrar para consumo dos contratos
  catalog/                # NOVO OU evolução da demo: Storybook opcional
specimens/                # NOVO: fixtures com falhas conhecidas
benchmarks/               # NOVO: casos e baselines independentes
```

**Regra de independência:** `contracts` não importa `visual`, `react`, `storybook` nem SDK de LLM; `composition` importa apenas contratos/tokens/CSS; `visual` recebe uma aplicação em execução e configuração; `evaluation` invoca as APIs públicas, não APIs internas da IA; `cli/mcp/adapters` são superfícies de transporte. Evitar dependências cíclicas. Distribuição do kit browser em pacote opcional para não pesar `@inteiro/cli` básico.

### 3.2 Contratos versionados

Definir três contratos públicos e um contrato de evidência:

- **DesignContract**: versão do IDS, semântica/tokens, identidade, temas, densidades, padrões de composição permitidos, states e a11y.
- **ImplementationContract**: tecnologia detectada, APIs CSS/HTML/componentes suportados, restrições de import, política de hardcodes, escopo e critérios executáveis.
- **VisualAcceptanceContract**: rotas, viewports, estados, fixtures, baseline IDs, tolerâncias, checks de DOM/a11y, política de revisão e ambiente.
- **EvidenceBundle**: diagnósticos, execução, hashes, imagens, diffs, relatórios, cobertura, aprovador e estado final.

Contratos DEVEM ter `schemaVersion`, `inteiroVersion`, hash determinístico, `createdAt` e identificador de configuração. Mudanças incompatíveis em schema exigem major; campos aditivos opcionais permitem minor. Não usar o nome “DTCG” para esquemas que não sejam de tokens; os novos esquemas são extensões próprias do INTEIRO.

## 4. E00 — Foundation & Contracts [P0]

### 4.1 Arquivo central e precedência

Criar `inteiro.config.json` como contrato canônico versionado de projeto consumidor, opcionalmente gerado por `inteiro init`. Configuração de tooling externo (e.g. `playwright.config.ts`) pode referenciá-lo. **Precedência obrigatória:** CLI flags explícitas > configuração do projeto > defaults publicados, com override de segurança restrito pela política de organização (política mais restritiva prevalece). Não permitir que flag desligue regra de segurança obrigatória em CI sem exceção formal.

O arquivo deve aceitar blocos `project`, `design`, `context`, `composition`, `static`, `browser`, `visual`, `review`, `repair`, `benchmark`, `reporting`. Paths relativos são resolvidos a partir da raiz definida; strings de rota são URLs relativas; URLs externas exigem allowlist.

### 4.2 Exemplo completo de configuração proposta

```json
{
  "$schema": "./node_modules/@inteiro/contracts/schemas/config.schema.json",
  "schemaVersion": "1.0",
  "project": { "id": "app-exemplo", "root": ".", "framework": "auto" },
  "design": {
    "theme": ["dark", "light"],
    "density": ["calm", "focus"],
    "contract": "@inteiro/design-system",
    "strictTokens": true
  },
  "context": { "mode": "enforced", "harness": "auto", "requireProof": true },
  "composition": {
    "allowed": ["app-shell", "data-table", "form-layout", "dialog", "empty-state"],
    "customPatterns": "review-required"
  },
  "static": {
    "profile": "strict",
    "include": ["src/**/*.{ts,tsx,js,jsx,vue,svelte,css,scss,html}"],
    "exclude": ["**/dist/**", "**/.next/**", "**/vendor/**"],
    "suppressionPolicy": "approved-only"
  },
  "browser": {
    "baseURL": "http://127.0.0.1:4173",
    "startCommand": "npm run dev -- --host 127.0.0.1 --port 4173",
    "readyPath": "/health",
    "timeoutMs": 60000,
    "environment": "pinned-chromium",
    "viewports": [
      { "id": "mobile", "width": 375, "height": 812 },
      { "id": "tablet", "width": 768, "height": 1024 },
      { "id": "desktop", "width": 1440, "height": 900 }
    ],
    "routesFile": "inteiro.routes.json"
  },
  "visual": {
    "baselineDir": "tests/visual/__snapshots__",
    "policy": "approved-only",
    "maxDiffPixelRatio": 0.002,
    "colorThreshold": 0.10,
    "fullPage": true,
    "missingBaseline": "block"
  },
  "review": {
    "requiredFor": ["new-pattern", "new-page", "significant-layout-change"],
    "method": "human-or-multimodal-plus-approval",
    "allowExternalProvider": false
  },
  "repair": { "maxAttempts": 2, "maxChangedFiles": 8, "maxDiffLines": 450 },
  "reporting": { "outDir": ".inteiro/reports", "formats": ["json", "html", "sarif", "junit"] }
}
```

**Notas normativas:** valores numéricos acima são *defaults iniciais propostos*, não thresholds comprovados por estudo. Ajustar em pilotos sem afrouxamento silencioso; `fullPage` é default para páginas estáveis, enquanto componentes podem usar captura delimitada. `readyPath` deve ser configurável, com fallback de healthcheck por URL base. `startCommand` é uma ação local sensível e nunca será executado a partir de arquivo remoto não confiável.

### 4.3 Modelo de estado de gate

Estados canônicos: `not_run`, `running`, `passed`, `failed`, `blocked`, `needs_review`, `waived`, `error`. `blocked` = pré-condição ausente (p.ex. baseline ou fixture); `failed` = verificação executada encontrou violação; `error` = infraestrutura; `needs_review` = decisão humana/multimodal pendente; `waived` = dispensa aprovada e expirada em data definida. O agregado retorna `passed` somente se **todas** as verificações obrigatórias estão `passed` ou possuem dispensa válida permitida; `not_run`, `error`, `blocked`, `needs_review` nunca equivalem a sucesso em `strict CI`.

### 4.4 Diagnósticos

Cada finding deve ter `id` estável, `ruleId`, `category`, `severity` (`info|warning|error|blocker`), `status`, `message`, `file`, `range`, `route`, `viewport`, `componentId`, `evidenceRefs`, `suggestedFix` e `fingerprint`. Não inserir screenshot binário em JSON ou prompt; armazenar em artefatos e referenciar por caminho seguro/hash. Dedupe por `fingerprint` para não repetir defeitos.

### 4.5 CLI pública proposta

| Comando | Contrato |
|---|---|
| `inteiro contract inspect --json` | Mostra contrato resolvido + origem de cada campo, sem segredos |
| `inteiro context verify --harness pi --json` | Prova descoberta/instalação/compatibilidade da integração |
| `inteiro compose list/show/validate` | Catálogo e validação de composições |
| `inteiro lint . --format json` | Auditoria estrutural/estática completa |
| `inteiro visual test --changed --json` | Browser + screenshots + behavior + a11y |
| `inteiro visual baseline propose` | Gera proposta isolada, nunca aprova |
| `inteiro visual baseline approve --review-id ...` | Promoção rastreável mediante autorização |
| `inteiro review request --run-id ...` | Submete evidências à revisão configurada |
| `inteiro gate run --profile ci --json` | Agrega todas as verificações obrigatórias |
| `inteiro benchmark run --suite ...` | Execução de benchmark reproduzível |
| `inteiro doctor --deep --json` | Verifica browser, fontes, adapters, catálogo, baselines |

Preservar códigos atuais (`0`, `2`, `3`, `4`, `5`) e **adicionar**, documentando: `6` = qualidade reprovada; `7` = revisão/precisão pendente; `8` = erro de execução/infra. A API JSON é fonte de verdade; stdout humano pode ter resumo, mas `--json` deve emitir **um único documento JSON válido** sem banners ou log misturado; logs vão para stderr. Todos os comandos de inspeção suportam `--dry-run` e são idempotentes quando não geram evidências novas.

## 5. E01 — Context Gate e integração obrigatória com agentes [P0]

### 5.1 Problema a resolver

Instalar uma skill ou declarar uma regra não prova que a LLM a consultou ou seguiu. O INTEIRO deve distinguir **discoverable** (arquivos encontrados), **loaded** (contexto provido para a tarefa), **used** (referência/seleção declarada e verificável no plano) e **compliant** (resultado passou nos testes). Nenhum adaptador deve alegar observar acesso interno ao contexto de um provedor quando essa telemetria não existe.

### 5.2 Interface de contexto

Implementar `resolveContext(task, project)` retornando pacote compacto (`contextBundle`) com:

- Metadados: `requestId`, `idsVersion`, `configHash`, `harness`, `taskType` (`new-page|change-page|component|fix|refactor`).
- Contrato base: leis de identidade indispensáveis, `data-in-theme`/`data-in-density`, uso das classes, proibições e política de commit.
- Seleção explícita: IDs de recipes/patterns relevantes, variantes permitidas, estados esperados, token refs e exemplos curtos.
- Aceite: comandos/gates obrigatórios, rotas/viewports/fixtures e evidências esperadas.
- Proveniência: caminhos e hashes de documentos efetivamente resolvidos; marcadores de `required/optional`.
- Restrições operacionais: limite de arquivos/linhas, áreas proibidas, política de segredos e condições de escalonamento.

**Orçamento de contexto:** objetivo inicial de até 4.000 tokens equivalentes para contexto base + seleção, configurável; consulta expandida sob demanda. Tratar tamanho como SLO operacional, não como garantia de qualidade. Evitar incluir os 316 tokens sempre.

### 5.3 Prova de integração por harness

Cada adaptador deve implementar:

1. `install`: preservar arquivos existentes e usar blocos delimitados/idempotentes.
2. `doctor`: verificar paths, versão, integridade e conflitos reais.
3. `resolve`: demonstrar que o contexto exigido **pode ser recuperado** pelo mecanismo do harness.
4. `smoke`: executar fixture sintética para testar invocação de CLI/MCP quando suportado; testes manuais documentados nos casos sem automação.
5. `handshake`: opcional; registrar `contextBundleId` no início do fluxo, sem confundir declaração do agente com leitura comprovada.

**Pi:** gerar `AGENTS.md` delimitado + `.pi/skills/inteiro-*` (ou paths documentados pela versão do Pi em uso), comandos determinísticos no contrato e configuração MCP **apenas quando a API real do Pi suportar**, com verificação. Não criar extensão Pi exclusiva somente para esse ponto se um comando CLI invocado pelo harness resolver. **Cursor:** manter regras `.mdc`, mas detectar se são acionadas por glob/scope ou por invocação manual; produzir aviso quando não forem automáticas. **Codex/Claude/Devin/Hermes:** seguir mecanismo oficialmente suportado e testes de contrato específicos.

### 5.4 Regras operacionais e falhas

- Tarefa classificada como alteração visual deve receber `contextBundle` antes de editar, ou status `blocked`.
- Se componente do catálogo não foi localizado, o agente deve reportar `pattern-unavailable` e solicitar seleção/revisão, em vez de inventar um componente “oficial”.
- O log deve registrar IDs de padrões selecionados e o hash do bundle, **não o prompt integral**, para evitar vazamento e coleta excessiva.
- Se o agente ignorar a instrução, o Static/Browser Gate continua a rejeitar desvios. O Context Gate nunca é a única proteção.

### 5.5 Testes de aceite E01

**CT-01:** instalar duas vezes no mesmo projeto resulta no mesmo conteúdo e sem duplicação. **CT-02:** remover/alterar `AGENTS.md` obrigatório é detectado pelo doctor. **CT-03:** em Cursor com regra não vinculada, o status evidencia o modo de acionamento. **CT-04:** falha do MCP não impede `lint`/`visual` locais; marca degradação da consulta, sem inventar sucesso do MCP. **CT-05:** bundle contém referências de tokens e padrões usados e fica dentro do orçamento configurado. **CT-06:** suporte a monorepo com múltiplas aplicações e raízes distintas sem contaminar políticas.

## 6. E02 — Composition Kit: componentes, layouts e estados executáveis [P0]

### 6.1 Estratégia

A biblioteca não deve virar um monólito React. Criar um **catálogo agnóstico de padrões implementáveis**, acompanhado de CSS com semântica e slots, snippets HTML de referência, contratos de comportamento, e adaptadores opcionais quando houver ganho real. `recipe` vira uma **especificação executável e testável**. React/Vue/Svelte podem consumir a mesma classe/markup sem obrigatoriedade de biblioteca UI especializada.

### 6.2 Inventário P0 de padrões

| Grupo | Padrões mínimos | Contrato de comportamento |
|---|---|---|
| Estrutura | `app-shell`, `page-header`, `content-container`, `sidebar`, `topbar`, `mobile-navigation` | landmarks, foco/ordem do DOM, colapso responsivo, área principal única |
| Informação | `data-table`, `data-list`, `details-panel`, `stat-card`, `dashboard-grid`, `filter-bar` | overflow local controlado, sort/paginação, empty/error/loading |
| Formulários | `form-layout`, `field-group`, `select`, `checkbox`, `radio-group`, `textarea`, `form-actions`, `stepper` | label, ajuda, validação, confirmação, foco no erro |
| Overlay | `dialog`, `drawer`, `popover`, `dropdown-menu`, `tooltip` | foco, escape, retorno do foco, z-index, scroll lock quando apropriado |
| Feedback | `alert`, `toast`, `inline-error`, `success`, `empty-state`, `skeleton`, `spinner`, `progress` | anúncio acessível, estados e não depender só de cor |
| Navegação | `tabs`, `breadcrumb`, `pagination`, `navigation-menu` | navegação por teclado, estado ativo e semântica correta |
| Editorial/identidade | `editorial`, `profile`, `costura`, `action-commit` | princípios próprios do INTEIRO sem banalizar a marca |

Onde já existe recipe, a tarefa é **elevá-la à conformidade executável**, não criar nome paralelo. O repositório poderá ter mais padrões depois; P0 exige catálogo mínimo acima com evidência para cada item. Para alguns controles nativos, usar a semântica HTML como implementação oficial, evitando wrappers artificiais.

### 6.3 Schema de padrão

Cada entrada `patterns/<id>.json` deve conter:

```json
{
  "schemaVersion": "1.0",
  "id": "data-table",
  "version": "1.0.0",
  "kind": "pattern",
  "description": "Tabela responsiva com estados e ações",
  "slots": ["title", "toolbar", "head", "body", "footer"],
  "variants": ["default", "compact", "bordered"],
  "states": ["default", "loading", "empty", "error", "selected"],
  "requiredTokens": ["color.text.primary", "color.border.default"],
  "allowedDependencies": ["@inteiro/tokens", "@inteiro/design-system"],
  "accessibility": {
    "semantics": ["table", "caption", "th", "scope"],
    "keyboardSpec": "docs/patterns/data-table-keyboard.md"
  },
  "responsive": { "mobileStrategy": "scroll-container" },
  "examples": ["examples/html/data-table.html"],
  "tests": ["tests/patterns/data-table.spec.ts"]
}
```

Os tokens do exemplo são ilustrativos: o validador deve resolver os IDs reais no catálogo e recusar referências inexistentes. `requiredTokens` deve listar referências mínimas, não impedir estilos semânticos válidos. As APIs públicas de cada padrão devem documentar semântica, variáveis CSS, atributos `data-*`, slots, dependências, fallback e comportamento nos estados.

### 6.4 Regras de layout e composição

- Adotar **container queries** quando o componente depende da largura do próprio container; usar media queries quando a decisão depende da página/viewport.
- `AppShell`: um `main`, navegação primária identificável, caminho para pular conteúdo; `sidebar` nunca deve reduzir a área útil a largura impraticável; responsividade baseada em limites medidos, não somente tamanhos arbitrários.
- `DataTable`: nunca usar `overflow-x: hidden` no body para disfarçar tabela; quando precisar overflow horizontal, limitar ao wrapper acessível e oferecer estratégia alternativa para leitura mobile.
- `FormLayout`: grid previsível, mensagens de erro semanticamente associadas, indicador de campo obrigatório e foco na primeira falha; ações primárias consistentes.
- `Dialog/Drawer`: foco gerenciado; retorno de foco ao gatilho; controle de `Escape`, semântica/labels adequados; evitar confundir modal com popover não modal.
- `Loading/Empty/Error`: states tipados para impedir que a LLM use espaço em branco como “loading”.
- `Commit` laranja não é sinônimo de todo botão principal; manter a semântica de ação que atravessa fronteira/publica, conforme identidade existente.
- Compatibilidade `data-in-theme=dark|light`, `data-in-density=calm|focus`, RTL e `prefers-reduced-motion` deve ser verificada em cada padrão aplicável.

### 6.5 “Padrão novo” e customização

Se o requisito não couber em padrão existente, a CLI deve permitir `inteiro compose propose <id>` gerando um *draft* com rationale, alternativas avaliadas, states, tokens e critérios. Isso produz `needs_review`; nenhum novo componente passa a ser “oficial” porque a IA o escreveu. Permitir customizações via **slots/variants e CSS vars semânticas**; proibir forks silenciosos de padrão oficial. Mudanças de contrato visual incompatíveis demandam versão major, mesmo quando TypeScript compile.

### 6.6 Testes P0 por padrão

Cada padrão deverá possuir: render padrão, render dos estados declarados, light/dark, calm/focus, teclado/foco, axe-core, captura em mobile/tablet/desktop, simulação de conteúdo longo, texto traduzido, strings vazias, zoom 200%, RTL quando aplicável e pelo menos um caso negativo controlado. Não exigir todas as combinações cartesianas em toda PR: testes pareados/smoke por mudança + matriz completa nightly; *todos* os estados obrigatórios devem estar cobertos no conjunto total.

**Aceite E02:** 100% dos padrões P0 têm manifesto validado, snippets executáveis, CSS testado e matriz de stories; 0 IDs de tokens não resolvidos; integração de referência em HTML puro e em pelo menos uma aplicação React, uma Vue e uma Svelte, sem duplicação das regras centrais.

## 7. E03 — Static Guard: lint de conformidade e restrições enforceable [P0]

### 7.1 Motor e alvos

Criar `@inteiro/lint` usando parsers adequados em vez de regex solta: **TypeScript/ESLint AST** para JS/TS/JSX/TSX, **PostCSS** para CSS/SCSS transformado e adapters AST/compiladores para Vue/Svelte/HTML. Se não houver suporte confiável para sintaxe, registrar `unsupported-syntax`; não reportar sucesso sobre arquivo ignorado implicitamente. Fazer integração com ESLint por pacote/plugin onde possível e disponibilizar CLI independente que unifica regras CSS+templates.

### 7.2 Catálogo mínimo de regras

| Rule ID | Condição | Severidade strict | Autofix |
|---|---|---|---|
| `IN-TOKEN-001` | Cor visual hardcoded onde token semântico é exigido | error | Não, salvo mapeamento inequívoco |
| `IN-TOKEN-002` | Uso direto de primitivo em componente que exige semântico | error | Sugestão, não automático |
| `IN-TOKEN-003` | CSS variable `--in-*` inexistente ou obsoleta | error | Alias publicado e unívoco |
| `IN-COMP-001` | Duplicação local de padrão oficial sem justificativa | warning/error por fingerprint | Não |
| `IN-COMP-002` | Uso de classe/variant oficial inexistente | error | Sugestão |
| `IN-COMP-003` | Import conflitante proibido por política | error | Remoção só se sem uso |
| `IN-STRUCT-001` | Uso de token de layout proibido por perfil | warning | Não |
| `IN-STRUCT-002` | Mais de um `main` no escopo da página estática | warning; navegador valida | Não |
| `IN-ACTION-001` | Múltiplos `primary` em região exclusiva | warning; contexto de região necessário | Não |
| `IN-ACTION-002` | `commit` aplicado sem decisão de negócio documentada | warning | Não |
| `IN-A11Y-001` | Elemento clicável genérico sem teclado/semântica | error | Não |
| `IN-A11Y-002` | Campo sem rótulo acessível em fonte analisável | error | Não |
| `IN-STATE-001` | Padrão sem estados mínimos exigidos | error | Template assistido |
| `IN-CTX-001` | Falta referência de contrato no manifesto de tarefa | blocker para tarefas assistidas por agente | Gerar scaffold |
| `IN-EXC-001` | Supressão inválida, expirada ou sem autoria | error | Não |

**Cuidado com interpretação semântica:** `IN-ACTION-001/002` e `IN-COMP-001` são heurísticas; o mecanismo não deve alegar conhecer a intenção de negócio. Modo estrito pode exigir *review* para ocorrências ambíguas, não produzir reprovação categórica sem evidência. Política de hardcode deve permitir exceções necessárias (`transparent`, `currentColor`, paletas externas controladas, SVG e gráficos) em perfis documentados.

### 7.3 Supressões e exceções

Exceções exigem comentário ou policy file com `ruleId`, `reason`, `owner`, `scope`, `createdAt`, `expiresAt` e `approvalRef` para regras bloqueantes. Nunca aceitar `/* inteiro-disable */` global sem expiração em CI. O relatório sempre mostra contagem e razão das supressões. Exceção permite uma divergência específica; não pode “desligar o IDS” inteiro.

### 7.4 APIs, saídas e integração com CI

`inteiro lint . --format json|sarif|stylish`, `--changed`, `--baseline <existing-diagnostics.json>`, `--strict`, `--fix-dry-run`, `--fix`. Autofix deve ser opt-in e ter diff prévio; rodar idempotentemente e preservar formatação. Integração com ESLint e stylelint pode ser oferecida como adaptadores, mas não criar dependência obrigatória de ambos no core. SARIF deve ser compatível com code scanning, incluindo arquivo/linha e `ruleId`.

### 7.5 Testes E03

- Corpus **positivo** com exemplos válidos em HTML, React, Vue e Svelte não pode gerar falsos positivos bloqueantes.
- Corpus **negativo** com ao menos um exemplar por regra deve gerar diagnóstico na linha apropriada.
- Teste de `--fix` aplicado duas vezes não produz diff na segunda.
- Arquivos gerados, `node_modules` e build outputs são ignorados por padrão e reportados no summary.
- Erro de parser produz `error/blocked`, não `passed`.
- Desempenho-alvo inicial: 95º percentil inferior a 15 s para 1.000 arquivos de código médio em máquina de referência divulgada; medir e ajustar com benchmark público.

## 8. E04 — Browser & Visual Gate: teste sobre interface renderizada [P0]

### 8.1 Motor e ciclo operacional

Adotar `@playwright/test` em pacote opcional de desenvolvimento. Um comando `inteiro visual test` deve: (1) resolver contrato e projeto; (2) validar ambiente e binário do browser; (3) levantar app via comando **explicitamente autorizado** ou conectar-se ao `baseURL`; (4) aguardar prontidão; (5) preparar fixtures; (6) executar fluxos/estados/viewports/temas; (7) realizar checks e capturas; (8) comparar baseline; (9) gerar relatório, diagnóstico e bundle; (10) liberar recursos. O browser **deve executar em build reproduzível** e respeitar isolamentos do projeto.

### 8.2 Registro de rotas/estados

Arquivo `inteiro.routes.json` é a matriz declarativa consumida pelo runner. Deve coexistir com testes Playwright tradicionais escritos pelo projeto, sem reescrever todos os testes de negócio.

```json
{
  "schemaVersion": "1.0",
  "routes": [
    {
      "id": "dashboard",
      "path": "/dashboard",
      "criticality": "high",
      "fixture": "dashboard-deterministic",
      "viewports": ["mobile", "tablet", "desktop"],
      "modes": ["dark-focus", "light-calm"],
      "states": [
        { "id": "default", "actions": [] },
        { "id": "empty", "fixture": "dashboard-empty", "actions": [] },
        { "id": "error", "fixture": "dashboard-error", "actions": [] },
        { "id": "filter-open", "actions": [
          { "type": "click", "target": { "testId": "open-filters" } },
          { "type": "expectVisible", "target": { "role": "dialog", "name": "Filtros" } }
        ] }
      ]
    }
  ]
}
```

**Segurança do DSL:** suportar ações allowlisted (`click`, `fill`, `select`, `press`, `expectVisible`, `expectText`, `waitForResponseAlias`, `screenshot`); não aceitar JavaScript arbitrário, `eval`, shell em actions nem seletores que saiam do app autorizado. Testes mais complexos permanecem em TypeScript revisado dentro do projeto. Usar `role`/nome acessível/testId estável, evitando seletores CSS frágeis.

### 8.3 Política de coverage

**Must-cover por rota crítica:** `default` + pelo menos um fluxo principal; `loading`, `empty`, `error`, `disabled`, `invalid`, `success`, `modal` e `long-content` são obrigatórios quando a funcionalidade os suporta. O manifesto deve declarar `not_applicable` com motivo para estados inexistentes. Gatilho de inspeção de rota alterada: arquivos de roteamento/framework, componentes com referências explicitamente cadastradas e mapeamento de dependências; quando a análise for inconclusiva, ampliar escopo ao invés de declarar que não há rota impactada.

Matriz padrão inicial de 5 larguras — **320, 375, 768, 1024, 1440 CSS px** — e alturas configuráveis; subset PR = 375, 768, 1440; CI completo/nightly = as cinco, além de 200% zoom quando aplicável. O protocolo existente menciona cinco viewports: alinhar a configuração final ao inventário real dessa API na implementação, sem assumir que esses números já sejam os valores publicados. Testes mobile devem exercitar navegação real e teclado, não apenas redimensionar.

### 8.4 Assertivas determinísticas

Obrigatórias por rota: carregamento sem erro fatal; landmark principal acessível; título/headings corretos conforme contrato; ausência de overflow horizontal de página; alvos críticos visíveis e alcançáveis; fontes carregadas; imagens essenciais sem `naturalWidth=0`; console/page errors relevantes; ausência de requisições inesperadas para domínios não aprovados; sem estado de carregamento infinito. Verificar overflow com cuidado: o scrolling horizontal intencional de uma tabela no próprio container não equivale a overflow horizontal do documento. Avaliar também bounding boxes de elementos críticos, recorte/oclusão e z-index de overlays via verificações específicas.

**Acessibilidade:** integrar `@axe-core/playwright` e checks manuais/documentados de teclado, foco, leitura e contraste não capturados pelo motor. Não prometer auditoria WCAG integral automatizada. Adotar WCAG 2.2 AA como alvo de produto para novos padrões, mantendo regras específicas da identidade e exceções justificadas. Validar conteúdo e foco com `getByRole` sempre que possível.

### 8.5 Screenshots e estabilidade

- Fixar navegador + versão Playwright + SO/base de imagem + fontes + timezone + locale, DPR, zoom, color scheme e motion.
- Usar relógio fixo/fixtures determinísticos para datas; congelar seeds de aleatoriedade; mockar endpoints e recursos de rede voláteis.
- Esperar por **condições observáveis** (selector, estado da app, resposta mockada), não por `sleep` arbitrário; aguardar fontes via `document.fonts.ready`.
- Desabilitar animações/transições na captura quando não são objeto do teste, mas possuir suite dedicada para motion quando necessário.
- Capturar screenshot de página e de componentes críticos; preferir snapshots de elementos para reduzir ruído de conteúdo irrelevante.
- Elementos dinâmicos só podem ser mascarados quando justificado e registrado em política; proibir máscara ampla que esconda defeitos.
- Para regressões visuais, comparar screenshot atual com baseline aprovada; diferenças deliberadas precisam passar pelo workflow E05.
- Usar `threshold` perceptual e `maxDiffPixelRatio` versionados por projeto/componente; não assumir que limites iguais servem a todas as classes de UI.

### 8.6 Matriz de falhas

| Código | Falha | Evidência exigida | Próxima ação |
|---|---|---|---|
| `VIS-ENV-001` | Browser/servidor indisponível | stderr, versões, healthcheck | Corrigir infra, sem patch visual |
| `VIS-DATA-001` | Fixture instável/incompleta | fixture id, resposta, trace | Corrigir fixture |
| `VIS-BASE-001` | Baseline inexistente/não aprovada | route/state e registro | Solicitar baseline aprovada |
| `VIS-DIFF-001` | Diff acima do limite | expected/actual/diff | Revisão ou correção focal |
| `VIS-LAYOUT-001` | Overflow/clipping | viewport, DOM box, screenshot | Corrigir layout |
| `VIS-ACCESS-001` | Violação a11y | regra, seletor, impacto | Corrigir semântica/interação |
| `VIS-RUNTIME-001` | Exceção de browser | stack e console sanitizados | Corrigir JS/app |
| `VIS-STATE-001` | Estado/ação ausente | step e selector | Corrigir fluxo |
| `VIS-REVIEW-001` | Julgamento visual pendente | checklist e capturas | Revisão humana/multimodal |

### 8.7 Aceite E04

- Pelo menos 20 casos positivos e negativos cobrem o pipeline; alteração induzida de largura, fonte, margem, overlay e token precisa ser detectada.
- Execução de mesmo commit/fixture no mesmo container resulta em imagem equivalente conforme threshold declarado; flakiness medida em 10 execuções repetidas por fixture canária.
- Em CI estrito, erro de infraestrutura, rota sem fixture obrigatória e missing baseline bloqueiam conclusão, mas produzem diagnóstico específico (não “UI ruim”).
- Tarefas sem alteração visual podem executar subset determinístico; rotas críticas alteradas passam por cobertura mínima obrigatória e nightly completa.
- Artifacts `actual`, `expected`, `diff`, trace e relatório estão disponíveis quando teste falha, com redaction.

## 9. E05 — Baseline Registry e governança de aprovação visual [P0]

### 9.1 Princípio e ciclo de vida

Playwright gera referência inicial, mas o INTEIRO **não deve considerar automaticamente a primeira imagem como verdadeira**. O registro de baseline guarda versões aprovadas e a cadeia de responsabilidade. Estados: `missing → proposed → under_review → approved → superseded`, com caminhos alternativos `rejected` e `expired`. Apenas baseline `approved` e compatível com contrato/ambiente é comparável em strict CI; `superseded` fica disponível para auditoria, não para teste corrente.

### 9.2 Identidade de baseline

Identificador determinístico composto por `projectId`, `routeId`, `stateId`, `viewportId`, `theme`, `density`, `browserVersion`, `renderProfile` e `baselineVersion`. Evitar depender exclusivamente de nome do arquivo. Metadados exigidos: `imageSha256`, `sourceCommit`, `sourcePullRequest`, `contractHash`, `fixtureHash`, `approvedBy`, `approvedAt`, `approvalReason`, `environmentFingerprint`, `previousBaselineId`. Checksums asseguram integridade; **não** asseguram, por si, qualidade.

### 9.3 Workflow de promoção

1. Alteração produz `actual` e `diff`, sem sobrescrever golden aprovada.
2. `baseline propose` cria candidato com metadados e relatório de diferenças.
3. Revisor autenticado vê lado a lado, overlay e diff, incluindo estados e viewports afetados.
4. Revisor aprova/rejeita **cada grupo coerente de alterações**, com justificativa e identificação; aprovação em massa deve informar contagem exata e impacto.
5. CI valida que a aprovação referencia exatamente o hash do artefato, commit e política atuais.
6. `baseline approve` promove golden aprovada em PR controlada, preservando antecessor e registro de aprovação.
7. Execução seguinte compara contra a golden promovida. Não aceitar aprovação só por resposta de chat do agente.

O usuário local pode trabalhar em modo `development` com baseline não aprovada e status `needs_review`; `CI strict` impede merge até promoção. Se a organização não dispuser de sistema de identidade de aprovadores, o modo P0 mínimo é revisão por PR com CODEOWNERS + aprovação em commit, não um banco de usuários próprio.

### 9.4 Proteção contra manipulação

- O mesmo PR que altera componente não pode alterar baseline em silêncio sem evento de revisão verificável.
- Alterações em `maxDiffPixelRatio`, `mask`, browser config ou arquivo de policy devem receber etiqueta `test-policy-change` e revisão especializada.
- O runner deve rejeitar screenshot de dimensão inesperada ou proveniente de ambiente diferente da golden.
- Baselines não devem conter dados pessoais, tokens, credenciais, perfis reais ou informação bancária. Usar fixtures fictícias e sanitizadas.
- Evitar imagens em logs textuais; publicar arquivos com permissões restritas e retenção configurável.

### 9.5 Critérios E05

**BL-01:** baseline ausente em CI resulta `blocked`, e nunca passa silenciosamente. **BL-02:** baseline proposta e rejeitada não pode ser usada em testes. **BL-03:** aprovação com hash de screenshot incorreto é recusada. **BL-04:** mudança visual aprovada e reexecutada no ambiente fixo passa sem atualização automática. **BL-05:** uma PR com máscara ampla/threshold alterado exige validação específica. **BL-06:** histórico de baseline permite rastrear origem e aprovador.

## 10. E06 — Catálogo visual vivo e testes de componentes [P0]

### 10.1 Escolha arquitetural

Evoluir `apps/demo` como **fonte de referência renderizada** em vez de mantê-la como vitrine estática isolada. Para web com Vite, utilizar Storybook + `@storybook/addon-vitest` com Browser Mode, `@storybook/addon-a11y` e snapshots locais pelo Browser Gate. O `@storybook/test-runner` legado não deve ser a fundação da implantação nova, pois sua manutenção oficial foi encerrada. O addon de visual cloud (Chromatic) pode ser adaptador opcional, não dependência mandatória; baseline local aprovada continua primeira opção open source.

**Importante:** Storybook serve como implementação de catálogo no repositório INTEIRO; **não é pré-requisito** para que qualquer aplicativo que consuma CSS e tokens use o IDS. Outros frameworks devem poder importar patterns e usar Browser Gate contra sua própria aplicação.

### 10.2 Matriz mínima por componente

Cada story deve declarar `patternId`, `variant`, `state`, `theme`, `density`, `viewportClass`, `interactionSpec`, `accessibilityExpectation` e `fixtureId`. O catálogo deve apresentar exemplos reais de composição e **anti-exemplos** identificados como incorretos (usados somente em documentação/testes negativos, nunca como baseline oficial aprovada). Testar também controles com texto longo, etiquetas traduzidas, itens vazios, imagens indisponíveis e dados extensos.

A documentação visual de cada padrão deve ter: propósito, quando usar/não usar, anatomia, variações, eventos, states, exemplo de marcação semântica, tokens utilizados, regras de conteúdo, dependências, exemplos responsivos, fluxo de teclado, erros comuns, notas de implementação e link para testes/baselines. A referência precisa ser utilizável por humanos **e** recuperável por agentes via manifesto JSON, sem varrer screenshots aleatórias.

### 10.3 Seleção e recuperação para agentes

Criar índice `catalog.index.json` pesquisável por intenção (`"tabela paginada"`, `"formulário de cadastro"`, `"dashboard operacional"`) com aliases em português e inglês e relações `recommendedPatterns`, `antiPatterns`, `examples`, `requiredStates`. Busca lexical local como padrão; embedding/reranker opcional somente após medir benefício. A resposta do MCP/CLI deve entregar top-k padrões com justificativa objetiva e caminho dos exemplos, jamais declarar compatibilidade não testada.

### 10.4 Testes E06

Catálogo compila e pode ser publicado como artefato estático; nenhuma story obrigatória falha em smoke/axe; stories de estados com interações funcionam; IDs de stories são estáveis; export do índice aponta somente para paths existentes; o bundle de documentação pode ser consumido offline após instalação. Suprimir toda dependência de rede para fontes e imagens das capturas de CI.

## 11. E07 — Feedback estruturado e Repair Controller agnóstico [P0]

### 11.1 Integração mínima

O INTEIRO não deve implementar agente generalista novo. Deve produzir **diagnósticos tipados e comando de reexecução** que podem ser consumidos por Pi, Cursor, Codex ou CI. Se o Pi já estiver orquestrado por extensão de acceptance gate/model routing, a integração preferencial é via CLI JSON, sem hooks de evento específicos não documentados.

### 11.2 Repair Envelope

Formato proposto de `repair.json`:

```json
{
  "schemaVersion": "1.0",
  "runId": "run-20261018-0001",
  "status": "repairable",
  "contextBundleId": "context:sha256:...",
  "attempt": 1,
  "maxAttempts": 2,
  "scope": {
    "allowedFiles": ["src/pages/dashboard.tsx", "src/styles/dashboard.css"],
    "maxChangedFiles": 8,
    "maxDiffLines": 450
  },
  "findings": [
    {
      "id": "finding-001",
      "ruleId": "VIS-LAYOUT-001",
      "severity": "error",
      "route": "/dashboard",
      "viewport": "mobile",
      "message": "Documento excede a largura do viewport em 38 px",
      "evidenceRefs": ["artifacts/dashboard-mobile-actual.png"],
      "suspectedSelectors": ["[data-testid='kpi-grid']"]
    }
  ],
  "requiredChecks": ["inteiro lint .", "inteiro visual test --changed"],
  "prohibitedActions": ["approve-baseline", "relax-threshold", "disable-rule"]
}
```

`contextBundleId` e `runId` são ilustrações: implementar validação forte de IDs/hashes. `suspectedSelectors` têm grau de confiança ou rótulo `heuristic`; não declarar a causa como certeza quando apenas sintoma foi observado.

### 11.3 State machine

`planning → coding → validating → (passed | repairable | needs_review | blocked | error)`. Ao receber `repairable`, o orquestrador fornece **apenas** falhas prioritárias agrupadas por causa provável, caminhos e screenshots específicos, trechos de arquivos permitidos e comandos. Após patch, repete subset afetado e gate total antes de concluir. Máximo default de duas tentativas automáticas por tarefa; se mesma assinatura de erro persistir após uma correção, não repetir patch idêntico; escalar por complexidade ou análise humana.

Condições de interrupção imediata: modificações fora do escopo, alteração de política/threshold/baseline pelo modelo, perda de testes previamente aprovados, crescimento de diff acima do limite, suspeita de vazamento de segredo, tentativa de acessar host não allowlisted. A LLM pode **sugerir** baseline nova, jamais promovê-la.

### 11.4 Modelo econômico

`light` = implementação e correções objetivas; `strong` = criação de padrão, decisões de composição inédita, bugs persistentes; `multimodal` = análise estética/perceptual com screenshot. A escolha é política externa do harness; INTEIRO fornece `taskRisk` e `reasonCodes`, sem acoplamento a nomes ou custos de modelos específicos. Gasto registrado por tarefa: tokens de entrada/saída quando disponíveis, preço da época, número de tentativas, CPU/browser time e intervenção humana.

### 11.5 Critérios E07

Mesmo erro não pode gerar loop infinito; relatório descreve por que houve escalonamento; nenhuma mudança em baseline/policy pode ser aplicada por ciclo de reparo; engine funciona sem IA (apenas gera envelope); um adapter de referência Pi consome `gate run --json` e encaminha achados estruturados; tratamento de falha de infra não incentiva “corrigir CSS” indevidamente.

## 12. E08 — Review Gate qualitativo: humano e multimodal [P0]

### 12.1 Fronteira entre fato e julgamento

Quatro categorias distintas de decisão:

1. **Determinística:** token proibido, overflow, botão sem label, screenshot mudou, modal não abre.
2. **Visual comparativa:** mudança frente a baseline aprovada; a diferença é objetiva, aceitar intenção depende de revisão.
3. **Qualitativa:** hierarquia, ritmo, densidade, clareza, adequação ao tom da marca; não existe teste pixel a pixel suficiente.
4. **De negócio:** prioridades, semântica de `commit`, informações indispensáveis; requer contexto e possivelmente aprovação do produto.

O multimodal participa da categoria 3 e ajuda a priorizar falhas das categorias 1–2, **não substitui** gates determinísticos nem aprovação de baseline.

### 12.2 Review Rubric

Rubrica com notas inteiras `0|1|2|3|4`, ancoradas em critérios de aceitação, por eixo:

| Eixo | O que observar | Exemplo de falha |
|---|---|---|
| Hierarquia | Primeiro foco, CTA, progressão e leitura | Quatro CTAs igualmente dominantes |
| Composição | Grades, alinhamento, proporção e containers | Margens inconsistentes entre seções |
| Densidade | `calm/focus` respeitados sem omitir dados | Focus ilegível ou Calm vazio |
| Identidade | Violeta/laranja, Costura, neutralidade | Commit laranja em ação sem fronteira |
| Conteúdo | Legibilidade, labels, instrução e estados | Erro genérico que não orienta |
| Responsividade | Ordem, prioridades e colapso | CTA crítico oculto no mobile |
| Robustez | Dados longos/vazios, zoom e fallback | Cards quebram com texto maior |

**Escala sugerida:** 0 = impeditivo, 1 = insatisfatório, 2 = aceitável com ressalva, 3 = bom, 4 = exemplar. Gates bloqueantes não podem ser compensados por média alta de rubrica; score qualitativo é secundário. Reviewer deve indicar `evidenceId`, elemento afetado, justificativa curta e ação objetiva; não basta emitir nota.

### 12.3 Política de invocação

Revisão qualitativa obrigatória para `new-page`, `new-pattern`, mudança relevante de arquitetura de layout, mudança de identidade e alteração visual deliberada sem referência suficiente. Para alterações locais em componente com baseline estável, visual diff + gates podem bastar, desde que política assim defina. Se provedor externo estiver bloqueado por privacidade, exigir humano/serviço local; não cair silenciosamente em review inexistente. A publicação de screenshots a LLM requer opt-in, minimização, sanitização e política de retenção/egress.

### 12.4 Avaliação do próprio revisor

Criar dataset de pares com decisões humanas de referência, incluindo casos com texto longo, overlays e densidades diversas. Medir concordância (por exemplo, acordo por eixo e correlação de ranking), falsos bloqueios, falhas graves perdidas e custo por revisão. `confidence` do modelo **não** deve ser tratado como probabilidade calibrada sem validação. Nenhum reviewer externo é “certificado” apenas por benchmark geral de visão.

### 12.5 Critérios E08

O revisor gera saída JSON validada por schema, cita evidências e não inventa componentes não vistos; status `needs_review` permanece quando a evidência está insuficiente; revisão humana pode discordar com justificativa; aprovação de baseline exige identidade autorizada; política de privacidade impede upload de artefatos sensíveis.

## 13. E09 — Benchmark próprio, reprodutível e orientado a custo real [P0]

### 13.1 Por que benchmark interno

Benchmarks genéricos de programação não medem diretamente fidelidade ao INTEIRO, responsividade, semântica de commit, retorno de foco ou consistência entre telas. A implantação deve possuir dataset fixo + casos ocultos, mesmo protocolo por modelo e medição do **resultado final por tarefa**, incluindo tentativas e reprocessamento.

### 13.2 Conjunto inicial P0

Definir **30 tarefas públicas de desenvolvimento** distribuídas em níveis (10 simples, 10 médias, 10 complexas) e **10 tarefas ocultas** usadas como proteção contra overfitting. Amostrar: cadastro com validação, tela de lista/paginação, dashboard, app-shell com mobile navigation, CRUD, empty/error/loading, modal/drawer, tema/densidade, RTL/texto longo, refatoração de tela existente, alteração de tokens/padrões e correção de regressão. Tarefas devem declarar implementação inicial, requisito funcional, contrato obrigatório, fixtures, critérios independentes e teto de tentativas. Não incluir respostas prontas no contexto oferecido ao modelo avaliado.

### 13.3 Protocolo justo

- Fixar commit do IDS, versões do harness, do browser, dataset, tool permissions e orçamento por tarefa.
- Cada modelo recebe mesmo requisito, ferramentas e tempo/limite de tentativas; variantes de prompt são experimentos separados.
- Executar **ao menos 3 amostras por modelo/tarefa** na fase de avaliação inicial; ampliar conforme variabilidade e orçamento. Registrar seed quando API permitir, sem assumir determinismo perfeito em LLMs.
- Medir **sem harness reforçado**, **com context gate**, **com composition + lint**, **com visual gate + repair** para estudos de ablação. Não atribuir melhora a um componente sem teste isolado.
- Não tratar 30/40 casos como benchmark científico universal; publicar protocolo, limitações, versões e intervalos de confiança. Amostragem adicional necessária antes de inferência sobre todos os projetos.

### 13.4 Métricas

| Métrica | Definição | Unidade |
|---|---|---|
| `pass_at_1` | Fração de tarefas aprovadas na primeira tentativa completa | % |
| `pass_within_budget` | Fração aprovada em até N reparos e orçamento fixado | % |
| `static_violations` | Findings ponderados por severidade | contagem |
| `visual_regressions` | Alterações não aprovadas identificadas pelo gate | contagem |
| `a11y_violations` | Violações automatizadas por gravidade + lacunas manuais | contagem |
| `human_acceptance` | Aprovação final por revisores cegos ao modelo | % |
| `rework_ratio` | Tempo de correção / tempo total da tarefa | % |
| `total_task_cost` | Tokens + ferramentas + revisão humana + infraestrutura | moeda/tarefa |
| `time_to_accepted` | Tempo até evidência completa e aprovação | segundos/minutos |
| `tokens_per_accepted_task` | Tokens consumidos / tarefas aceitas | tokens/tarefa |
| `flaky_test_rate` | Testes que oscilam sem alteração de código | % |
| `false_positive_rate` | Achados marcados como falsos por revisor | % |

Apresentar distribuição, medianas, P90, intervalos de confiança para proporções e custo por tarefa; não resumir tudo em score único que esconda trade-offs. `pass_at_1` deve ser distinguido de taxa de sucesso dentro de até N tentativas (evitar comparar com `pass@k` acadêmico de múltiplas amostras independentes). Amostras e budget registrados por modelo.

### 13.5 Metas de aprovação propostas (hipóteses, não fatos)

- 100% das tarefas com baseline crítica válida têm evidência estruturada.
- ≥ 95% de detecção de **defeitos sintéticos conhecidos** injetados em fixtures de regressão (meta interna que depende da representatividade do dataset).
- 0 permissões de publicação de baseline automáticas por agente.
- Taxa de falsos positivos bloqueantes ≤ 3% no corpus válido de referência.
- Reduzir o custo mediano por tarefa aceita em ≥ 25% frente ao fluxo atual, **sem queda estatisticamente detectável na aceitação humana** em suite de referência; se não atingir, publicar resultado e ajustar política antes de declarar ROI.
- Taxa de flaky tests ≤ 1% na suíte canária de CI.

Essas são metas de engenharia a validar; não constam como benchmarks publicados do INTEIRO.

### 13.6 Critérios E09

Runner exporta `results.json`, dataset commit, config/env hashes e relatório HTML/CSV; reproduz experimentos com mesmos artefatos; previne edição acidental de casos ocultos na execução; calcula custo total e sucesso; separa falha de modelo de erro de ambiente; detecta divergência de versões entre experimentos. Publicar pelo menos um experimento com dois perfis de modelo (leve e mais capaz), sem divulgar segredos/API keys.

## 14. E10 — CI, segurança, relatórios e adoção em projetos [P0]

### 14.1 Perfis de execução

| Perfil | Gatilho | Checks obrigatórios | Política de conclusão |
|---|---|---|---|
| `dev` | Execução local | contract, lint, subset visual afetado | Pode `needs_review`; nunca mentir `passed` |
| `pr` | Pull request | static, browser subset, baselines relevantes, a11y | Bloqueia findings error/blocker e review mandatória |
| `main` | Merge branch protegida | suite crítica completa + publicação de evidências | Falha fechada, sem auto-approve |
| `nightly` | Agenda | todas rotas/estados, browsers adicionais, zoom/RTL | Abre regressão com links para evidências |
| `release` | Release IDS | suite do core e apps exemplo + benchmark smoke | Bloqueia release com regressão P0 |

Verificações obrigatórias no `main` não podem ser contornadas por `--changed` calculado incorretamente. Implementar fallback seguro `changed scope uncertain → broader suite`.

### 14.2 Dependências, imagens e execução

`@playwright/test`, browsers, axe, Storybook e bibliotecas de imagem devem ser dependências de desenvolvimento em pacotes especializados, não dependências runtime dos tokens. Instalação reprodutível com lockfile, checksums e imagens de container fixadas por tag e preferencialmente digest; versão de pacote Playwright deve ser compatível com browser da imagem. Para aplicações sob teste, usar rede local/loopback ou container isolado; bloquear URLs de produção e serviços de terceiros por padrão. As imagens oficiais Playwright incluem browsers/dependências, mas o pacote npm precisa ser instalado separadamente.

Rodar testes sem privilégios desnecessários; limitar filesystem, rede, CPU, memória, concorrência e tempo. Quando artefatos forem processados por modelo externo, limpar HTML/texto de instruções injetadas em página, não permitir que texto renderizado mude a política do agente, e ocultar segredos. Separar comandos da fonte confiável de conteúdos observados em páginas.

### 14.3 Evidence Bundle e reporte

Estrutura de saída (proposta):

```text
.inteiro/reports/<runId>/
  summary.json          # contrato canônico
  diagnostics.sarif      # análise estática e browser (quando aplicável)
  junit.xml             # integração CI
  report.html           # visão humana local
  context.json          # hashes e paths (sem prompts completos)
  environment.json      # versões relevantes
  coverage.json         # rota × estado × viewport × modo
  screenshots/
    <caseId>-expected.png
    <caseId>-actual.png
    <caseId>-diff.png
  traces/               # traces sanitizados
  review.json           # avaliações e aprovação
  repair.json           # somente se houver falhas reparáveis
```

**Envelope mínimo `summary.json`:** `schemaVersion`, `runId`, `projectId`, `gitSha`, `contractHash`, `startedAt`, `finishedAt`, `status`, `gates[]` (nome/status/duração/coverage/diagnosticIds), `artifacts[]` (relativePath/sha256/mediaType/privacyClass), `approval[]` e `exitCode`. O consumidor nunca deve precisar interpretar logs textuais para descobrir por que o gate reprovou.

### 14.4 Proteção de dados e segurança

- **Secrets:** não exportar `process.env`, cookies, Authorization headers, localStorage, payloads reais ou gravações de sessão com informações sensíveis. Sanitização e fixtures fictícias obrigatórias.
- **PII:** screenshots só com dados sintéticos; review externo desativado por padrão; classificação `public|internal|restricted`; `restricted` exige executor local/humano aprovado.
- **Artefatos:** retenção padrão proposta de 14 dias para runs locais/PR, 90 dias para baselines aprovadas e metadados, configurável por compliance; baseline versionada pode exigir retenção maior.
- **Supply chain:** pin de versões, SBOM no release, análise de vulnerabilidade de dev/runtime e plano de correção; não ignorar avisos de CI por serem “só dev dependency”.
- **Saída de IA:** validada por JSON Schema; não executar shell arbitrário extraído de texto do modelo, dados da página ou MCP não confiável.
- **Autorização:** aprovação de baseline/waiver separada de permissões do agente de codificação; proteger diretório golden e política por CODEOWNERS ou mecanismo equivalente.
- **Filesystem:** normalizar paths, impedir `../` escapando do workspace, proibir symlinks para destinos fora da raiz autorizada e recusar output overwrites não autorizados.

### 14.5 Compatibilidade e migração

`inteiro init` deve reconhecer projeto antigo sem sobrescrever `AGENTS.md`, `inteiro.css`, regras do Cursor e configuração customizada. Modo `migrate --dry-run` deve produzir diff legível e backup/checksum; `--yes` aplica apenas alterações seguras sem apagar personalizações. **Fases de adoção**, ainda todas P0: `observe` (diagnósticos sem bloqueio), `enforce-new` (bloquear problemas introduzidos), `enforce-all` (bloquear todos os erros obrigatórios). A promoção entre modos exige critério publicado; não permitir `observe` indefinidamente em release nova.

### 14.6 Documentação e UX

Fornecer quick-start de até cinco comandos para projeto web suportado, inclusive projeto sem Storybook; instalação offline depois de `npm install`; erros acionáveis com `nextAction`; `doctor --deep` verifica browser/fixtures/fonts/integração; modo CI é não-interativo; dashboards HTML mostram cobertura e diffs sem obrigar serviço SaaS. Todos os exemplos devem rodar na versão publicada do pacote.

### 14.7 Critérios E10

Pipeline de PR encontra uma regressão sintética com artefatos utilizáveis; relatório JSON parseável sem stdout espúrio; paths maliciosos e URLs externas não autorizadas são bloqueados; `--dry-run` não altera arquivo; browser indisponível produz exit code de infra; release não aumenta bundle runtime de tokens por trazer Playwright/Storybook; migração de projeto 1.1.0 preserva arquivos e comportamento anterior.

## 15. Integração com o Pi e demais harnesses: fluxo operacional de referência

### 15.1 Sem criar “agentes em cascata”

O Pi (ou qualquer harness) deve orquestrar no máximo estas responsabilidades lógicas: **Implementer** (gera diff), **Validator** (CLI determinística do INTEIRO) e **Reviewer** (humano/LLM visual quando política exigir). Validator não é necessariamente subagente: é um processo local que executa comandos e emite JSON. Escalonamento pode reutilizar o mesmo subagente com modelo diferente. Não adotar arquitetura multiagente sem evidência de ganho em benchmark de ablação.

### 15.2 Sequência por tarefa

1. **Classify:** determinar `taskType`, risco, rotas impactadas e padrões da UI.
2. **Resolve:** executar `inteiro context verify` e obter `contextBundle` aplicável.
3. **Plan:** registrar `task.manifest.json` com scope, componente/recipe, aceite e gates. A LLM pode sugerir plano, mas contrato valida estrutura.
4. **Implement:** editar apenas escopo aprovado. Reusar Composition Kit antes de customizar.
5. **Static:** executar lint/contract e testes unitários/build do projeto.
6. **Browser:** executar fluxos relevantes em navegador real, incluindo no mínimo mobile/tablet/desktop definidos pela policy.
7. **Review:** se for regressão objetiva, devolver findings; se baseline inexistente ou layout deliberadamente novo, abrir revisão.
8. **Repair:** máximo `maxAttempts`; registrar diffs e razões de escalonamento.
9. **Gate all:** antes da conclusão, executar `inteiro gate run --profile pr --json` e verificar cobertura.
10. **Report:** publicar `summary.json`, lista de artefatos e indicação clara de `passed|failed|needs_review|blocked|error`.

### 15.3 Pseudocódigo da integração

```ts
const task = await classifyTask(userRequest, repoMetadata);
const context = await inteiro.resolveContext(task);
if (!context.ready) return { status: "blocked", reason: context.reason };

let attempt = 0;
while (attempt <= policy.repair.maxAttempts) {
  if (attempt === 0) await implementer.execute(task, context.bundle);
  const report = await inteiro.gate.run({ profile: "pr", changed: true });

  if (report.status === "passed") return finalizeWithEvidence(report);
  if (report.status === "needs_review" || report.status === "blocked" ||
      report.status === "error") return escalate(report);

  if (!report.repairable || attempt === policy.repair.maxAttempts)
    return escalate(report);

  const repairEnvelope = inteiro.repair.fromReport(report, policy);
  await implementer.repair(repairEnvelope);
  attempt += 1;
}
```

`await` e objetos são pseudocódigo de interface, não uma promessa sobre métodos atualmente publicados no repositório. O protocolo de integração real deve usar `spawn` da CLI e parsing JSON validado ou ações oficiais do plugin/harness. Não iniciar correção automática para `blocked/error` sem causa classificada.

### 15.4 MCP e CLI

A CLI permanece fonte estável para execução determinística. O MCP deve adicionar ferramentas **finas**, não “fazer tudo”:

- `inteiro_get_contract` — resumo versionado, patterns e checks por tarefa.
- `inteiro_find_pattern` — top-k padrões/casos de uso com exemplos e IDs.
- `inteiro_validate_composition` — conformidade estrutural de padrão.
- `inteiro_get_gate_report` — lê bundle já gerado e findings filtrados.
- `inteiro_get_repair_context` — devolve somente erro priorizado + evidências seguras.

`inteiro_get_visual_review` **deve permanecer** por compatibilidade, podendo passar a apontar a evidências/testes concretos. Evitar implementar navegador como processo servidor MCP de longa duração se CLI efêmera resolve; se houver serviço de browser compartilhado, usar isolamentos e limites de sessão. Tool responses devem trazer status e proveniência explícitos; nada de mensagens mistas de texto livre e JSON como protocolo obrigatório.

## 16. Critérios transversais de aceitação (Definition of Done)

A implementação só poderá ser marcada como P0 completa se todos os critérios a seguir forem verdadeiros:

| ID | Critério transversal | Evidência |
|---|---|---|
| DoD-01 | Os 11 épicos E00–E10 atingem suas condições de aceite | Matriz assinada por mantenedor |
| DoD-02 | `npm run ci` legado continua passando, com novos checks compatíveis | Logs versionados da pipeline |
| DoD-03 | Projetos HTML, React/Next, Vue e Svelte adotam e validam o núcleo | Fixtures e testes e2e por stack |
| DoD-04 | CLI e MCP continuam funcionais offline após instalação | Smoke local sem internet |
| DoD-05 | Todas as regras detectáveis possuem testes positivo/negativo | Coverage de regras e mutant fixtures |
| DoD-06 | Nenhuma baseline é promovida pelo agente sem aprovação | Teste de autorização negativo |
| DoD-07 | Toda UI crítica alterada possui comparação visual + checks DOM/a11y | Coverage matrix por PR |
| DoD-08 | Nenhum `blocked`, `error`, `not_run` ou `needs_review` vira `passed` | Testes de agregação de estado |
| DoD-09 | Benchmarks reproduzíveis medem custo por tarefa aceita | Dataset e resultados exportados |
| DoD-10 | Artefatos não contêm secrets/PII de fixtures de teste | Scanner/redaction tests |
| DoD-11 | Docs e exemplos são reexecutáveis da versão publicada | Docs smoke tests |
| DoD-12 | Adoção de projeto 1.1.0 não exige reescrita do frontend | Relatório de migração e compatibilidade |

### 16.1 Cenários BDD críticos

**SCN-01 — Drift de token detectado:** dado componente que usa `#6D5DC7` diretamente em vez do token semântico existente, quando `inteiro lint` roda em strict, então produz `IN-TOKEN-001` com arquivo/linha e falha sem modificar o código.

**SCN-02 — Overflow em mobile detectado:** dada tabela que força largura do `documentElement` acima de 375 CSS px, quando a suite de rota executa, então `VIS-LAYOUT-001` identifica a rota, viewport e screenshot; scroll horizontal **apenas no wrapper autorizado** não reprova o documento.

**SCN-03 — Baseline inexistente:** dado novo formulário sem golden, quando PR roda gate strict, então o estado é `blocked`/`needs_review`, `VIS-BASE-001`; um screenshot proposto não vira golden sozinho.

**SCN-04 — Mudança legítima aprovada:** dado redesign documentado, quando o revisor aprova imagem/hash/policy válidos, então baseline é promovida e uma nova execução passa sem atualizar snapshots automaticamente.

**SCN-05 — Instrução ignorada pelo modelo:** dado modelo que não consulta skill, quando gera classe inexistente e usa cor arbitrária, então `context verify` registra o limite observável de integração e Static Gate reprova a implementação.

**SCN-06 — Falha de browser:** dado Chromium não instalado, quando `visual test` inicia, então retorna `error` e código de infraestrutura sem solicitar à IA que altere layout.

**SCN-07 — Loop guard:** dado erro que persiste após duas tentativas, quando Repair Controller avalia histórico, então produz `needs_review` com três execuções registradas (inicial + duas correções), sem terceira correção automática.

**SCN-08 — UI de dados sensíveis:** dado fixture com placeholder marcado `restricted`, quando revisão externa está desabilitada, então nenhuma imagem sai para provedor de LLM; review local/humano permanece disponível.

**SCN-09 — Componente inexistente:** dado `inteiro compose show nonexistent`, quando CLI executa, então devolve `not found` e lista sugestões reais sem fabricar contrato.

**SCN-10 — Monorepo:** dados dois apps com themes e rotas distintas, quando o gate é executado por workspace, então cada app usa seu `configHash`, baselines e relatórios isolados.

**SCN-11 — Layout novo com UI aparentemente válida:** dado dashboard sem overflow, WCAG automatizada sem violações e tokens corretos, mas hierarquia visual ruim, quando policy exige `Review Gate`, então status fica `needs_review` até decisão rastreável.

**SCN-12 — Teste que oscila:** dado screenshot instável por timestamps não congelados, quando canário executa múltiplas vezes, então publica flakiness e sugere correção da fixture, não aumentar indiscriminadamente o threshold.

## 17. Backlog técnico detalhado: tudo P0

Os itens abaixo são *work packages* para issues/PRs. Ordenação por pré-requisitos; todos recebem rótulo `priority/P0` e devem entrar no mesmo marco de conclusão.

| ID | Dependências | Entregável verificável | Critérios de saída |
|---|---|---|---|
| WP-01 | — | Inventário de pacotes/APIs reais do 1.1.0 + ADRs | Paths atuais mapeados, divergências registradas |
| WP-02 | WP-01 | `@inteiro/contracts`, schemas e estados | Validação de exemplos válidos/inválidos |
| WP-03 | WP-02 | `inteiro.config.json` + resolver de precedência | Tests de precedence, paths e overrides |
| WP-04 | WP-02 | Context resolver + bundle compacto | Proveniência e orçamento auditáveis |
| WP-05 | WP-04 | Doctor/adapter Pi e smoke tests dos demais | Instalação idempotente e detecção de conflitos |
| WP-06 | WP-02 | Manifesto de padrões + Composition Kit básico | API documentada, sem React obrigatório |
| WP-07 | WP-06 | Padrões estrutura/navegação | A11y, mobile, states e stories |
| WP-08 | WP-06 | Padrões forms/feedback/overlays | A11y, teclado, estados e stories |
| WP-09 | WP-06 | Padrões dados/dashboard/editorial | Overflow, densidade e dados longos |
| WP-10 | WP-02/06 | Static Guard JS/TS/CSS | Rules por AST + corpus positivo/negativo |
| WP-11 | WP-10 | Adaptadores de lint Vue/Svelte/HTML | Sem silêncio em sintaxe não suportada |
| WP-12 | WP-02 | Browser runner, lifecycle e fixtures | Isolamento, readiness e JSON status |
| WP-13 | WP-12 | Checks DOM, flow, a11y, console | Casos negativos detectados e evidências |
| WP-14 | WP-12 | Screenshot comparator determinístico | Diff reproduzível em env fixo |
| WP-15 | WP-14 | Baseline Registry + aprovação | Sem autoapprove e hashes auditáveis |
| WP-16 | WP-06/12 | Catálogo Storybook e índice JSON | 100% padrões P0 documentados |
| WP-17 | WP-02/13 | Evidence Bundle JSON/SARIF/JUnit/HTML | Consumer parseável e report consistente |
| WP-18 | WP-17 | Repair Envelope e controller de tentativas | Sem loops/alterações indevidas |
| WP-19 | WP-15/17 | Human/Multimodal Review Gate | Rubrica, política e controle de egress |
| WP-20 | WP-16/18 | Dataset de benchmark + runner | Ablações, métricas e resultados |
| WP-21 | WP-05/15/17 | Integração CI e profiles | PR/main/nightly/release funcionais |
| WP-22 | WP-21 | Migração 1.1.0 + guias por framework | App legado migra sem regressão |
| WP-23 | Todos | Hardening, security checks, performance | DoD-01 a DoD-12 e release readiness |

### 17.1 Caminho crítico e paralelização

- **Trilha A — contratos e agentes:** WP-01–05.
- **Trilha B — composições e catálogo:** WP-06–09, WP-16.
- **Trilha C — checks e navegador:** WP-10–15, WP-17.
- **Trilha D — revisão, benchmark e adoção:** WP-18–23.

Em termos de dependência, WP-02 desbloqueia A/B/C; WP-12 habilita evidências reais; WP-15/17 habilitam aprovação; WP-20 comprova benefício. Não publicar release “P0 concluído” com apenas uma trilha finalizada. É permitido disponibilizar **preview/experimental** por etapa com matriz de limitações explícita.

## 18. Decisões arquiteturais a registrar (ADRs)

| ADR | Decisão | Alternativa rejeitada | Motivação |
|---|---|---|---|
| ADR-001 | Core agnóstico e CSS-first | Biblioteca UI exclusivamente React | Portabilidade atual é requisito do produto |
| ADR-002 | CLI determinística + MCP fino | Agente especializado sempre ativo | Menor acoplamento, melhor reprodução |
| ADR-003 | Playwright como browser gate | Screenshot via navegador manual apenas | Automação e evidência repetível |
| ADR-004 | Golden aprovada, não autoatualizada | Atualizar snapshots a cada build | Evitar normalizar defeito |
| ADR-005 | Storybook para catálogo web, não consumidor obrigatório | Exigir Storybook em cada app | Documentação viva sem impor stack |
| ADR-006 | AST/PostCSS antes de LLM para enforcement | Prompt com lista de regras | Detectabilidade e custo previsível |
| ADR-007 | Revisão qualitativa separada | “Passou screenshot, logo está bonito” | Diferença não equivale à adequação |
| ADR-008 | Benchmark custo/tarefa aceita | Escolher modelo por preço/tokens apenas | Retrabalho domina o custo real |
| ADR-009 | Reparo limitado | Loop autônomo ilimitado | Previsibilidade e segurança |
| ADR-010 | Fixtures sintéticas + redaction | Usar dados reais do usuário em testes | Privacidade e estabilidade |

## 19. Observabilidade, SLOs e políticas de qualidade

O relatório do gate deve expor: duração de cada estágio, testes executados/omitidos, distribuição de findings por categoria, baseline churn, ratio de rotas cobertas, flakiness, tamanho de bundle, tempo de reparo, custo de inferência quando recebido do harness, taxa de escalonamento, cache hit de contexto e causas de infra failures. Não capturar prompts completos por padrão. Métricas agregadas anonimizadas são suficientes; evitar telemetria externa obrigatória.

**Metas operacionais iniciais (a medir):** `context resolve p95 < 250 ms` local; `static lint p95 < 15 s/1.000 arquivos` no hardware de referência; `visual changed subset p95 < 180 s` para um app exemplo pequeno e fixtures estáveis; `report serialization < 2 s` excluindo imagens; flakiness de canários `< 1%`; erro de parser/fixture não oculto. Essas metas são **objetivos de teste propostos**, não performance já comprovada. Publicar medição de baseline antes de tornar thresholds bloqueantes.

**Criticidade:** regras de segurança, token desconhecido, erro de runtime e acessibilidade grave são blocker/error; problemas qualitativos não determinísticos abrem `needs_review`, não são transformados artificialmente em erro técnico. O schema de políticas deve suportar perfis rígidos sem confundir julgamento com verificação objetiva.

## 20. Estratégia de release, compatibilidade e rollback

**Pré-release:** executar comparação entre INTEIRO 1.1.0 e nova branch em projetos fixtures; capturar classes CSS, tokens, saída CLI, exports e comportamento de adapters. **Versionamento:** adicionar comandos/features compatíveis permite minor de pacote, mas mudança de CSS pública, convenção semântica ou API consumidora incompatível exige major segundo SemVer e contrato visual existente; versão final deve ser determinada por diff real, não antecipada neste RFC.

**Rollout:** publicar experimental package (`next` tag ou tarball local) para smoke; executar em monorepo INTEIRO e dois consumidores piloto; aplicar `observe`, depois `enforce-new`, finalmente `enforce-all` em CI protegido. **Rollback:** retornar dependência, políticas e baseline registry à versão anterior sem apagar evidências; golden antiga permanece versionada; comandos legados continuam documentados. **Compatibilidade:** detecção de Node `>= 22.14` conforme README, com teste nas versões Node oficialmente suportadas pelos novos pacotes Playwright/Storybook escolhidos; se incompatível, especificar ambiente runner separado, sem aumentar requisito do núcleo desnecessariamente.

## 21. Riscos e mitigação

| Risco | Consequência | Mitigação obrigatória |
|---|---|---|
| Baseline instável | Alert fatigue e desconfiança nos testes | Browser/font pin, fixtures, canários e relatórios |
| IDS excessivamente restritivo | UI mecânica e perda de flexibilidade | Slots, tokens semânticos, proposals e waivers |
| Lint com falsos positivos | Agentes burlam regras | Corpus de referência, ajustes e severidades distintas |
| Storybook domina monorepo | Peso e acoplamento | Apps/catalog separado, dependências dev, build isolado |
| Prompt injection em página | Políticas/segredos afetados | Tratar DOM como dado não confiável, sem shell baseado em página |
| Dados reais em capturas | Incidente de privacidade | Fixtures sintéticas, sanitização e revisão local |
| Reviewer multimodal alucina | Aprovação/reprovação injustificada | Evidência obrigatória, rubrica, comparação humana, calibração |
| Benchmarks sobreajustados | Modelo escolhido não generaliza | Casos ocultos, amostragem e suite evolutiva |
| Escalonamentos caros | Custo acima do aceitável | Routing por risco, budget, limite de correções |
| Falha de CI externa | Merge bloqueado indevidamente | Dependências offline e distinguir infra de quality |
| Drift entre adapters | Resultados diferentes entre harnesses | Core único, contract tests e testes E2E por harness |
| Mudanças de tokens sem semver | Identidade inconsistente | Hash do contrato e política de versionamento visual |

## 22. Plano de validação final — matriz de ambientes

| Dimensão | Casos obrigatórios na release |
|---|---|
| Tecnologias | HTML/CSS, React, Next, Vue, Svelte, Tailwind adapter; Flutter/Swift apenas contrato de tokens |
| Temas | dark, light; variantes de contraste existentes conforme suporte real |
| Densidades | calm, focus |
| Viewports | 320, 375, 768, 1024, 1440 px |
| Input | mouse, teclado, touch em fluxos suportados |
| Estados | default, focus, hover, selected, disabled, loading, empty, error, success, invalid, readonly |
| Conteúdo | vazio, extenso, strings traduzidas, números grandes, imagens falhas |
| Ambientes | Windows dev, Linux CI fixo, offline após install |
| Browser | Chromium fixado na matriz P0; Firefox/WebKit em suite complementar onde viável |
| Agentes | Pi + ao menos Cursor/Codex em smoke real; demais adapters com contrato/limitações expostas |
| Modos de gate | dev, pr, main, nightly, release |
| Falhas induzidas | hardcode, falta de label, overflow, diff, baseline missing, erro de healthcheck, secret em screenshot, suppression vencida |

A matriz completa não exige rodar **todas** as combinações em cada PR. Aplicar seleção baseada em impacto na PR, bateria completa na nightly/release e manter coverage declarada por dimensão para evitar áreas permanentemente sem teste.

## 23. Referências técnicas e decisões fundamentadas

As referências abaixo sustentam a seleção de ferramentas e conceitos, **não** servem de evidência de que metas propostas já foram atingidas:

1. **INTEIRO (AS-IS):** [README](https://github.com/Borges360/ids); [COMPONENTS](https://github.com/Borges360/ids/blob/main/docs/COMPONENTS.md); [AGENTS](https://github.com/Borges360/ids/blob/main/docs/AGENTS.md); [VALIDATION_REPORT](https://github.com/Borges360/ids/blob/main/docs/VALIDATION_REPORT.md). Base da análise de gaps.
2. **Design Tokens Community Group:** [Design Tokens Format Module 2025.10](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/). Compatibilidade e semântica de fonte de tokens; relatório de Community Group, não W3C Recommendation.
3. **Playwright:** [Visual comparisons](https://playwright.dev/docs/test-snapshots), [Docker/ambiente](https://playwright.dev/docs/docker), [Accessibility testing](https://playwright.dev/docs/accessibility-testing). Base de screenshots, estabilidade e automação.
4. **Storybook:** [Vitest addon](https://storybook.js.org/docs/writing-tests/integrations/vitest-addon), [Accessibility testing](https://storybook.js.org/docs/writing-tests/accessibility-testing), [Visual testing](https://storybook.js.org/docs/writing-tests/visual-testing). Catálogo vivo e integração com browser.
5. **Storybook test runner:** [Aviso de descontinuação de suporte](https://storybook.js.org/addons/%40storybook/test-runner). Não usar runner legado como fundação de nova implantação.
6. **ESLint:** [no-restricted-imports](https://eslint.org/docs/latest/rules/no-restricted-imports). Exemplo de regra enforceable de imports; regras próprias do INTEIRO precisam ser implementadas e testadas.
7. **W3C WAI/WCAG:** [WCAG 2.2](https://www.w3.org/TR/WCAG22/). Alvo de acessibilidade; automação cobre apenas parte dos critérios.
8. **Design2Code (NAACL 2025):** [estudo](https://aclanthology.org/2025.naacl-long.199/). Motivação para avaliar estrutura/layout renderizado, não só correção sintática.

## 24. Checklist de entrega e comando de verificação final

Antes da publicação de release, o mantenedor deve completar e versionar um arquivo `release-evidence.json` referenciando cada `WP`, `DoD` e cenário BDD. Um release gate deve executar, de forma reexecutável:

```bash
npm ci
npm run ci
npx inteiro doctor --deep --json
npx inteiro context verify --harness pi --json
npx inteiro lint . --format json
npx inteiro visual test --all --json
npx inteiro gate run --profile release --json
npx inteiro benchmark run --suite p0-smoke --json
```

**Atenção:** os comandos novos acima são **especificação de API futura**; eles ainda precisam ser implementados e publicados. Até lá, não devem aparecer em README como comandos disponíveis. A evidência final deve distinguir falha de requisito, alteração visual pendente, erro de ambiente e impossibilidade de verificação.

---

**Definição de sucesso:** um modelo leve não precisa inventar layouts, tokens ou estados; ele recupera um contrato mínimo, implementa sobre padrões conhecidos e é incapaz de declarar a UI concluída sem evidência. O INTEIRO passa a ser não só identidade visual compartilhada, mas **infraestrutura de qualidade verificável para desenvolvimento assistido por IA**.
