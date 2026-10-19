# Contratos e gates

Quick-start em um consumidor instalado:

```sh
npx inteiro init --harness pi --yes
npx inteiro agents install pi --yes
npx inteiro context plan --task "Formulário de cadastro" --type component --files src/form.html --patterns form-layout --acceptance "Erros associados aos campos e envio validado" --record --json
npx inteiro context verify --task-context --json
npx inteiro gate run --profile pr --start --json
```

Configure primeiro rotas, fixtures sintéticas e `browser.baseURL` em `inteiro.config.json`. Storybook não é requisito do consumidor. Use `--start` somente para autorizar o `browser.startCommand` local; o runner não executa shell recebido da página ou da DSL de ações. URLs não locais exigem allowlist explícita.

O exemplo configura `context.harness=pi` na inicialização. Para uma configuração existente, preserve seu plano e use `context resolve --record --json`; se necessário passe `--harness pi` aos comandos de contexto e gate. `context plan` recusa sobrescrever um manifesto. A declaração deve conter classificação, arquivos permitidos, padrões e critérios de aceite. `contractRefs` permite vincular documentos locais por caminho e checksum verificado. `--dry-run` não grava manifesto nem recibo.

O gate obrigatório `task-context` refaz a resolução e verifica conteúdo, hash, configuração, tarefa, padrões oficiais e proveniência do recibo em `.inteiro/contexts/`. Mudanças de requisito, escopo, instrução ou política exigem nova resolução. `loaded=unobserved` continua explícito; `used=declared` registra o vínculo declarado, sem alegar observar o interior de um modelo. IDs com formato correto e recibos cujo conteúdo foi adulterado não satisfazem o gate nem autorizam reparo automático.

## Instalação e execução offline

A Recursive variável completa acompanha `@inteiro/composition/fonts`, com os arquivos WOFF2 originais e sua licença OFL. Demo, catálogo, Storybook e fixtures usam arquivos locais. O projeto declara `browser.requiredFonts` e checksums em `browser.fontAssets`; o runner bloqueia arquivos ausentes/adulterados e reporta erro de infraestrutura quando uma face exigida não carrega. O fingerprint do ambiente inclui os assets de fonte verificados.

`@inteiro/contracts` valida JSON Schema sem navegador, frameworks ou SDK de IA. `@inteiro/composition` fornece manifestos/HTML/CSS. `@inteiro/lint` agrega parsers TypeScript, PostCSS, HTML, Vue e Svelte. O pacote opcional `@inteiro/visual` é instalado no workspace de desenvolvimento com `@playwright/test`, Chromium e `axe-core`. Tokens não recebem dependência de browser. Após instalação e download dos browsers, os comandos determinísticos não precisam de rede externa.

```sh
npm install -D @inteiro/visual @playwright/test axe-core
npx playwright install chromium
npx inteiro gate run --profile pr --json
```

Perfis aceitos: `dev`, `pr`, `ci`, `main`, `nightly`, `release`. O runner amplia o escopo quando não há certeza sobre o conjunto alterado. Perfis protegidos sempre executam a matriz declarada; nenhum perfil transforma evidência ausente em sucesso. O workflow agendado amplia os viewports dos testes do catálogo.

## Contratos e políticas

Precedência: defaults < projeto < flags explícitas; restrições de `.inteiro/organization-policy.json` prevalecem para segurança. As origens são apresentadas por `contract inspect`. Raízes e paths são validados contra traversal e symlinks externos. Configurações inválidas, sintaxe não suportada e falhas de parser produzem erro/bloqueio tipificado.

A política tem schema próprio em `@inteiro/contracts/schemas/organization-policy.schema.json` e tipo público `OrganizationPolicy`. O arquivo exige `schemaVersion: "1.0"`; a API assume essa versão quando o argumento não a informa. Não é uma segunda configuração de projeto: campos fora do schema são recusados. A política passada à API e o arquivo local são aplicados cumulativamente; o arquivo não pode relaxar o argumento. Limites de reparo, tokens de contexto, timeout e tolerâncias visuais usam o menor valor. Origens externas usam interseção e não admitem credenciais, paths ou wildcards. `allowedOrigins: []` não concede origens adicionais; o localhost continua disponível para fixtures locais. As URLs das auditorias de política usam domínios `.invalid`, sem requisições de rede.

Permissões de composição usam interseção; uma interseção vazia bloqueia, em vez de virar a convenção de lista irrestrita. Nessa lista, `[]` na política significa ausência de restrição adicional. Imports/tokens proibidos, classificações que exigem revisão, fontes, rotas críticas, formatos de relatório e temas/densidades de cobertura completa são acumulados. Includes de lint são unidos e apenas excludes idênticos permitidos em ambas as camadas permanecem. A adoção nunca recua de `enforce-all` para `enforce-new` ou `observe`. Viewports fixam a geometria dos IDs declarados, sem substituir o subset de execução de cada perfil. Duas políticas com geometria ou hash de fonte incompatíveis são recusadas. `strictTokens`, `requireProof` e `fullPage` obrigatórios não podem ser desligados, e uma proibição de provedor externo não pode ser revertida por outra camada.

O Context Gate distingue descoberta, acesso interno não observado e conformidade do resultado. Instalação idempotente preserva instruções existentes e registra integridade dos arquivos resolvidos. `context resolve --task "tabela" --harness pi --json` devolve seleção lexical, tokens, exemplos, proveniência e orçamento. A consulta não certifica que o modelo leu seu contexto.

Saídas: `0` aprovado; códigos legados `2–5` preservados; `6` reprovação de qualidade; `7` bloqueio/revisão pendente; `8` infraestrutura. `--json` imprime um documento JSON. Lint suporta JSON, SARIF e stylish. `--fix` não altera código quando não existe transformação inequivocamente segura. `--dry-run` não escreve relatórios nem imagens. Supressões em `.inteiro/exceptions.json` exigem regra, justificativa, owner, escopo, criação, expiração e aprovação.

## Baselines e identidade do revisor

`visual baseline propose --start --json` produz candidatos separados. A primeira captura não é aprovada. O registro conserva predecessor e aprovador e recusa hashes, commits, políticas ou ambientes divergentes.

O revisor mantém sua chave privada fora do repositório. O arquivo protegido `.inteiro/reviewers.json` mapeia identidade para chave pública Ed25519. Uma aprovação contém `reviewId`, `candidateId`, `candidateHash`, `imageSha256`, `sourceCommit`, `contractHash`, `policyHash`, `reviewer`, `reason`, `approvedAt`, `expiresAt` e assinatura Base64 do payload canônico (sem `signature`). `candidateHash` vem de `baselineMetadataHash()` de `@inteiro/visual/baseline` e vincula também rota, fixture, viewport, ambiente e predecessor. `canonical()` e `hash()` são APIs públicas de `@inteiro/contracts`. O agente de implementação não gera aprovações de produto.

```sh
npx inteiro visual baseline approve --review-id PR-123 --approval review-123.json --json
```

Proteja política de revisão, configuração, registro e imagens com CODEOWNERS e regras da branch. A assinatura é verificada novamente no runner. Chaves criadas pelos testes são temporárias e aceitas apenas nas fixtures isoladas; não constituem aprovação do produto.

## Review e repair

`.inteiro/task.json` declara o tipo de alteração. `new-page`, `new-pattern` e `significant-layout-change` exigem revisão qualitativa. `review request --run-id <id>` produz uma solicitação com sete eixos de rubrica. Uma decisão assinada em `.inteiro/reviews/decision.json` deve vincular run, hash de evidência, commit de origem, `sourceHash`, config, tarefa, hashes de imagens e expiração. `reviewSourceHash()` de `@inteiro/contracts` calcula o hash dos arquivos avaliados, excluindo a própria decisão e o registro de baselines; assim a decisão pode ser versionada sem referência circular ao seu commit. Uma média alta nunca anula falhas determinísticas. Revisores externos permanecem desabilitados por padrão.

As capturas finais e intermediárias participam de `artifactHashes`, preservando hashes repetidos quando quadros distintos têm bytes idênticos. A revisão confere também a associação de cada imagem à rota, estado, viewport, tema, densidade, índice da ação e demais metadados do quadro. Trocar imagens entre ações, omitir uma captura ou mudar seus bytes invalida a decisão. Uma nova execução pode usar caminhos de arquivo diferentes se os bytes e a identidade dos quadros permanecerem iguais. Configuração e tarefa devem corresponder à evidência assinada. Justificativas compostas apenas por espaços são inválidas.

`review request` grava `<reporting.outDir>/<runId>/review.json`, com `kind=review-request`, vínculos preparados para assinatura e referências de todas as capturas; fonte/tarefa/configuração desatualizadas bloqueiam a solicitação. `repair request` grava `repair.json` no mesmo diretório, com `kind=repair-context`. Esses arquivos são solicitações/diagnósticos, não comprovam revisão aprovada nem reparo executado, e não se sobrescrevem. `--dry-run` não os grava. Os schemas públicos são `review-request.schema.json` e `repair-context.schema.json`; `SignedReviewDecision` e `ReviewCaptureReference` estão disponíveis no pacote agent-core.

No Cursor, o doctor interpreta somente o frontmatter YAML da regra, conforme os [modos documentados pelo Cursor](https://cursor.com/docs/rules): automático, por glob, solicitado pelo agente ou manual. Globs vazios não indicam escopo; sem descrição nem globs a regra é manual. O instalador gera glob entre aspas, pois `**` sem aspas é interpretado como alias YAML. Metadados inválidos, duplicados ou não suportados são bloqueados; `loaded` continua `unobserved`. A prova exige checksum para cada arquivo obrigatório e publica SHA-256 dos bytes. Recibos antigos com hash do texto JSON canônico continuam verificáveis como `legacy-canonical-json`; `agents install` ou `recordContextIntegrity` os renovam para bytes, sem conceder aprovação visual.

`repair context` gera envelope sem chamar IA. Erros de infraestrutura e bloqueios não iniciam correção de CSS. Há no máximo duas tentativas, interrupção por erro repetido e limites de arquivos/linhas. Alterações em política ou baseline interrompem o ciclo. O harness deve aplicar o patch e reexecutar o gate total.

## Evidências e benchmark

Cada execução gera summary JSON, SARIF, JUnit, HTML, ambiente e cobertura em `.inteiro/reports/<runId>`. Capturas e traces ficam referenciados por paths locais e hashes. Logs de texto são sanitizados; fixtures restritas não são capturadas nem enviadas externamente.

`benchmark run --suite p0-smoke --json` executa o corpus determinístico. Os 30 casos públicos e dez reservados ao avaliador ficam em `benchmarks/`. O contexto do agente não recebe respostas do benchmark. Para importar observações reais de um harness:

```sh
npx inteiro benchmark run --observations experiment.json --json
```

O import usa `experiment-input.schema.json`: exige SHA completo do commit, hashes de dataset/config/ambiente, booleanos reais e contadores não negativos (tokens inteiros seguros). `initialAccepted=true` exige aceitação final e uma única tentativa. Identidades de modelo/tarefa/amostra são deduplicadas sem ambiguidade por delimitadores. Evidência fornecida é relida e seus hashes e configuração são conferidos. Uma tarefa aceita precisa dos cinco gates completos (`context`, `task-context`, `static`, `browser`, `review`), cobertura estática integral em `enforce-all`, identidade da tarefa correspondente e capturas vinculadas aos artefatos. Um relatório só de lint ou sem execução de navegador não comprova aceitação.

`outcome` distingue `accepted`, `model_failure`, `environment_error` e `incomplete`. Falhas sem classificação ficam em `unclassifiedFailures`; não são automaticamente atribuídas ao modelo. As taxas usam apenas tarefas aceitas ou classificadas como falha de modelo; sem esse denominador a taxa é `null`. Custos de todas as observações entram no custo total, inclusive infraestrutura, e valores desconhecidos permanecem `null`. JSON, CSV e HTML incluem essas contagens, medianas, P90 e intervalos de Wilson.

A validação dos hashes declarados e dos relatórios ainda não atesta a fixação do protocolo, versões ou independência do dataset; esses critérios permanecem pendentes no ledger de E09. O experimento real de dois modelos e o smoke com agentes reais foram retirados do escopo por orientação do solicitante nesta entrega.

## Migração e rollback

`init` preserva configurações existentes. `audit` legado continua disponível. Use `migrate --dry-run` para inspecionar sugestões antes de alterar a aplicação. Comece observando findings; corrija o corpus existente antes de impor o gate inteiro na branch protegida. Não publique uma release declarada P0 completa enquanto faltarem baselines aprovadas, revisão exigida ou evidências de aceite. Rollback restaura versões, configuração e registro anteriores, preservando histórico de evidências.

`migrate` aplica somente substituições de declarações CSS aprovadas por escopo explícito. A política declara `schemaVersion=1.0` e `mappings`; cada entrada contém `from`, `tokenId`, `files`, `selectors`, `properties`, `owner`, `reason` e `approvalRef`. Arquivo, seletor, propriedade e valor devem corresponder exatamente. Por exemplo: mapear `#6D5DC7` para `color.identity.primary` apenas em `src/legacy.css`, seletor `.choose`, propriedade `color`, quando a intenção documentada for uma escolha da identidade. Um mesmo hex usado em outro papel permanece para revisão. Famílias tipográficas podem ser mapeadas para `font.family.sans` ou `font.family.machine` pelo mesmo mecanismo.

```sh
npx inteiro migrate src --mapping .inteiro/migration-policies/choice.json --dry-run --json
npx inteiro migrate src --mapping .inteiro/migration-policies/choice.json --yes --plan-hash HASH_DO_PREVIEW --json
```

O preview contém diff e hashes antes/depois. A aplicação refaz o plano, recusa o hash desatualizado e grava originais em `.inteiro/migration-backups/<planHash>/`, com manifesto de checksums, antes de editar. Comentários, formatação, finais de linha e declarações fora do escopo permanecem. Fontes com encoding sem round-trip UTF-8 e erros de parser bloqueiam a aplicação. Sintaxes React/Vue/Svelte/HTML continuam preservadas, com `unsupported-syntax` para migração automática; use os diagnósticos do lint e revisão semântica nessas fontes. A migração pode aplicar o subset CSS autorizado e manter `needs_review` para o restante; isso não certifica o frontend. Backups são locais e ignorados pelo Git. Sem `--yes`, a inspeção legada permanece não bloqueante, com estado explícito em JSON.

O deploy Jenkins foi retirado do escopo pelo solicitante; nenhuma execução de deploy integra a evidência desta entrega.

## Reparo determinístico e integração Pi

`runRepairController` de `@inteiro/agent-core` recebe o relatório inicial, `contextBundleId`, escopo explícito e duas funções do harness: `propose`, que devolve apenas edições textuais, e `validate`, que executa o subset afetado e depois o gate completo. O núcleo verifica o hash do arquivo antes do patch, calcula o tamanho do diff, recusa caminhos protegidos e reverte a edição se perder checks aprovados, detectar problema de segurança ou falhar a validação. A resposta inclui histórico, motivos de escalonamento e os relatórios inicial/afetado/completo. Infraestrutura ou revisão pendente não iniciam reparo automático.

O exemplo `examples/pi/repair-adapter.ts` consome a CLI com `spawn`, sem shell, valida schema/hash/status/código de saída e encaminha somente o envelope e fontes permitidas à função de proposta. Ele não usa hooks privados do Pi nem inicia modelos. O harness é responsável por fornecer o consumidor de propostas e impedir que ele escreva diretamente no projeto. A função `piDiagnosticsOnly` funciona sem IA.

## Matriz de release

Hashes de objetos usam ordenação lexical UTF-16 das chaves, sem depender do locale do sistema. Configurações resolvidas incluem `design.contract=@inteiro/design-system`. Após essa atualização, refaça os recibos com `context resolve --record`; decisões assinadas que não correspondam mais aos hashes devem voltar ao fluxo de revisão, sem aprovação automática. A mudança de hash não autoriza substituir goldens.

O hash de fontes inclui arquivos versionados e arquivos novos não ignorados pelo Git, sem uma whitelist de diretórios. Isso cobre `src`, assets públicos, componentes, configurações de raiz e outras estruturas de aplicações. Arquivos explicitamente listados no escopo da tarefa participam mesmo se ignorados pelo Git. Fontes removidas deixam de participar, antes ou depois de stage. Relatórios, revisões, recibos e backups operacionais ficam fora do hash; IDs derivados do recibo não alteram o conteúdo substantivo do plano. Estado de ferramentas ainda não versionado em `.codex`, `.cursor` e `.pi`, além de `.env*`, `.mcp.json` e `.ai-memory.toml` não é descoberto como fonte. Fontes privadas necessárias devem ser declaradas deliberadamente no plano, sem exportar seu conteúdo em evidências. Diretórios de saída personalizados devem ser ignorados pelo Git, para que relatórios não se tornem entradas de sua própria validação.

O perfil `release` adiciona o gate `release`: exige os 58 IDs de épicos, work packages, DoD e cenários, todos aprovados com evidências cujo hash corresponda aos arquivos. `release-evidence.json` registra o estado auditável e as exclusões solicitadas; sua presença sozinha não aprova a entrega. A matriz atual mantém as pendências de aceite explícitas.

A assinatura do mantenedor usa a política `.inteiro/reviewers.json`. O payload Ed25519 é `canonical({ledger, approval})`, onde `ledger` é o documento sem o campo `approval` e `approval` contém `reviewer`, `approvalRef`, `approvedAt` e `expiresAt`, sem `signature`. A assinatura Base64 fica em `approval.signature`. Ela vincula requisitos, evidências, versão, hash de fontes/configuração/política e exclusões. O agente não cria essa assinatura para a biblioteca; os testes usam somente chaves sintéticas temporárias.

Os modos de adoção são `static.adoption=observe|enforce-new|enforce-all`. Observe mantém o status real do relatório, mas permite saída não bloqueante do lint isolado. Enforce-new exige um baseline de diagnósticos com owner, justificativa, aprovação e expiração; findings novos continuam bloqueantes. Main, nightly e release recusam modos diferentes de enforce-all. O gate estrito do workflow permanece bloqueado enquanto faltarem referências ou revisões aprovadas.

## Tarballs com runtime JavaScript

Use `npm run pack:p0` para gerar a distribuição instalável em `artifacts/tarballs`. O staging transpila fontes para JavaScript e ajusta os exports dos tarballs, preservando os exports de fonte no workspace. Isso evita a restrição de type stripping do Node dentro de `node_modules`. `npm run smoke:offline -- --seed-cache` prepara o cache uma vez e comprova reinstalação offline, consulta de tokens/padrões, instalação/verificação do contexto Pi e ferramentas MCP no consumidor isolado. `npm run smoke:offline` reutiliza o cache preparado.
