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

As fixtures visuais declaram um relógio fixo e podem declarar `seed` inteiro entre 0 e 4294967295. Sem esse campo, a semente deriva do hash do conteúdo completo da fixture. O runner instala `Math.random()` determinístico antes dos scripts da aplicação, em cada documento e iframe, e reinicia a sequência ao navegar ou recarregar. Capturas registram `randomSeed` e `randomProfile`; o perfil também integra o fingerprint de ambiente, impedindo reutilização silenciosa de aprovação criada com outro mecanismo. As APIs criptográficas permanecem nativas; fixtures devem evitar depender delas para conteúdo visual variável.

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

Para medir a qualidade de um revisor contra decisões de referência já registradas, use `benchmark run --calibration observations.json --json` ou a API `calibrateReviews` de `@inteiro/evaluation/calibration`. `--dry-run` valida e calcula em memória, retorna `not_run` (exit 7) e preserva os relatórios existentes. A execução normal grava `<reporting.outDir>/calibration/calibration.json`. Esse modo não se combina com `--suite`, `--protocol` ou `--observations`.

O input segue `review-calibration-input.schema.json`: `schemaVersion=1.0`, `kind=recorded-review-calibration`, `reference: {path, sha256}`, `configHash`, `currency` e `observations`. Cada observação declara `caseId`, `reviewer`, `version`, `promptHash`, `artifactHashes`, sete `axes`, `verdict` (`accept`, `block`, `insufficient`), `rank` (inteiro positivo ou null), `cost`, `durationMs`, `tokensIn` e `tokensOut`. Custo e tokens desconhecidos são null. Um veredito `insufficient` pode declarar `axes=null`, sem inventar notas; os sete eixos são obrigatórios em decisões `accept` ou `block`. A concordância por eixo divulga quantos casos foram avaliados e quantos ficaram sem notas. Cada combinação reviewer/versão/prompt precisa cobrir exatamente todos os casos; variantes de prompt são grupos distintos.

A referência assinada segue `review-calibration-reference.schema.json`: `kind=review-calibration-reference`, `purpose=human-reference|synthetic`, `idsCommit`, `configHash`, `rubricVersion=1.0`, `reviewer`, `approvalRef`, `reason`, `signedAt`, `expiresAt`, `signature` e `cases`. Cada caso contém `id`, `density` (`calm|focus`), `scenarios` (`long-text|overlay|default`), dois ou mais `captures: {id, path, sha256}`, os sete eixos, `verdict` (`accept|block`), `severe` e `rank` (inteiro positivo ou null). Cada eixo contém `axis`, nota inteira 0–4, `evidenceId` de uma captura do caso, `element`, `reason` e `action`. Uma falha grave exige veredito de bloqueio. O corpus precisa abranger texto longo, overlays e ambas as densidades.

A autorização vem exclusivamente de `.inteiro/calibration-reviewers.json`, com `schemaVersion=1.0` e `reviewers: {identidade: {kind: "human"|"synthetic", publicKey: "PEM Ed25519"}}`. A assinatura Ed25519 cobre `canonical(referenceSemSignature)` em UTF-8; o snapshot do input usa SHA-256 dos bytes do arquivo assinado. Uma identidade sintética não pode assinar uma referência humana. A CLI não cria essa política, chaves ou referências humanas. Datas assinadas usam ISO 8601 em UTC (Z), com milissegundos opcionais de três dígitos; datas normalizadas ou dependentes de locale são recusadas. Assinatura, expiração, hashes das imagens, identidade dos casos/eixos e vínculos às capturas são conferidos antes de exportar resultados.

O relatório separa concordância de decisão e por eixo, erro absoluto de nota, correlação de Spearman com empates, falsos bloqueios, falhas graves aceitas indevidamente e encaminhamentos `insufficient`. Denominadores e IDs dos casos problemáticos são explícitos. Correlação sem pares suficientes ou sem variação e taxas sem denominador ficam null. Mediana usa a média dos dois valores centrais em amostras pares; P90 usa nearest-rank. Custos desconhecidos não viram zero: aparecem como contagem desconhecida, subtotal conhecido e total/custo médio null. Somatórios não finitos ou tokens além de inteiros seguros são recusados.

`humanReferencesAvailable=false` identifica corpus sintético; `certified=false` vale para todos os relatórios. A medição não aprova reviewer, release ou baseline e não interpreta `confidence` como probabilidade calibrada. As tags de cenário são declarações do signatário; a ferramenta não infere semântica dos pixels. O corpus humano real e sua avaliação permanecem pendentes até existirem referências autorizadas.

Cada execução gera summary JSON, SARIF, JUnit, HTML, ambiente e cobertura em `.inteiro/reports/<runId>`. Capturas e traces ficam referenciados por paths locais e hashes. Logs de texto são sanitizados; fixtures restritas não são capturadas nem enviadas externamente.

`benchmark run --suite p0-smoke --json` executa o corpus determinístico. Os 30 casos públicos e dez reservados ao avaliador ficam em `benchmarks/`. O contexto do agente não recebe respostas do benchmark. Para importar observações reais de um harness:

```sh
npx inteiro benchmark run --observations experiment.json --json
```

Na importação, `--dry-run` valida os dados e as evidências, calcula as métricas em memória e retorna `not_run` com `dryRun=true` (exit 7). Não cria nem sobrescreve relatórios. A API correspondente é `importExperiment(root, path, outDir, { dryRun: true })`.

O import usa `experiment-input.schema.json`: exige SHA completo do commit, hashes de dataset/config/ambiente, booleanos reais e contadores não negativos (tokens inteiros seguros). `initialAccepted=true` exige aceitação final e uma única tentativa. Identidades de modelo/tarefa/amostra são deduplicadas sem ambiguidade por delimitadores. Evidência fornecida é relida e seus hashes e configuração são conferidos. Uma tarefa aceita precisa dos cinco gates completos (`context`, `task-context`, `static`, `browser`, `review`), cobertura estática integral em `enforce-all`, identidade da tarefa correspondente e capturas vinculadas aos artefatos. Um relatório só de lint ou sem execução de navegador não comprova aceitação.

`outcome` distingue `accepted`, `model_failure`, `environment_error` e `incomplete`. Falhas sem classificação ficam em `unclassifiedFailures`; não são automaticamente atribuídas ao modelo. As taxas usam apenas tarefas aceitas ou classificadas como falha de modelo; sem esse denominador a taxa é `null`. Custos de todas as observações entram no custo total, inclusive infraestrutura, e valores desconhecidos permanecem `null`. JSON, CSV e HTML incluem essas contagens, medianas, P90 e intervalos de Wilson.

Sem protocolo, o relatório declara `protocol.status=not_verified` e `publicationReady=false`. Para conferir um plano congelado e sua amostragem registrada:

```sh
npx inteiro benchmark run --observations experiment.json --protocol evaluator/protocol.json --dry-run --json
```

O contrato `benchmark-protocol.schema.json` exige commit do IDS, commit e SHA-256 dos dois datasets, hash de configuração, snapshot de ambiente, ao menos dois modelos com versões, hash de prompt compartilhado, três seeds distintas, as quatro ablações, permissões e orçamento comum. O ambiente declara `idsVersion`, `harness: {name, version}` e `browser: {name, version, fingerprint}`. `environmentHash` é o SHA-256 dos bytes desse arquivo; `datasetHash` é `hash({public: publicSnapshot.sha256, heldout: heldoutSnapshot.sha256})`, usando a função canônica de `@inteiro/contracts`.

Cada snapshot contém `path` e `sha256`. Os datasets precisam de 30 tarefas públicas (dez `simple`, dez `medium`, dez `complex`) e dez ocultas, sem IDs duplicados. Cada tarefa declara `id`, `requirement`, `initialImplementation`, `contract`, `fixtures` (arquivos), `grading: {path, sha256}` e `maxRepairAttempts`. As tarefas públicas também declaram `difficulty`. Os bytes dos datasets, implementações iniciais, contratos, fixtures e critérios são conferidos contra o commit fixado. Os 40 casos atuais possuem critérios executáveis independentes; o importador exige que as observações aceitas vinculem os recibos funcionais aos mesmos hashes de fonte, commit e configuração dos gates.

As permissões são `readRoots`, `writeRoots`, `tools` e `network: "deny"`; raízes são paths existentes relativos ao projeto, sem globs. Nenhuma raiz de leitura ou escrita pode incluir o protocolo, o dataset oculto ou os critérios do avaliador, inclusive por symlink. O orçamento declara `maxAttempts` (até três), `maxDurationMs`, `maxTokens`, `maxCost` e `currency` (ISO de três letras). Toda combinação modelo/tarefa/ablação/seed precisa aparecer exatamente uma vez; tokens, custo, tempo humano e desfecho devem ser conhecidos, sem exceder orçamento. Por exemplo, dois modelos × 40 tarefas × quatro ablações × três seeds exigem 960 observações.

Uma validação desse plano retorna `protocol.status=passed`, hash do protocolo e escopo `frozen-declarations-and-recorded-sampling`. `publicationReady` continua `false`: a conferência dos registros não atesta execução externa, aplicação real das permissões, entrega do prompt, independência dos critérios ou calibração humana. Esses critérios permanecem pendentes no ledger de E09. O experimento real de dois modelos e o smoke com agentes reais foram retirados do escopo por orientação do solicitante nesta entrega.

## Critérios funcionais independentes do benchmark

As 30 tarefas públicas (dez simples, dez médias, dez complexas) e dez reservadas possuem starters por domínio em `benchmarks/workers/`, instruções `TASK.md`, fixtures sintéticas de API e snapshots de critérios em `benchmarks/evaluator/criteria/`. `initialFiles` lista as fontes iniciais; o protocolo congelado confere esses arquivos e as instruções contra o commit fixado. Os starters são deliberadamente incompletos. Referências válidas e defeitos conhecidos ficam somente em `benchmarks/evaluator/`; não entram nos arquivos materializados do candidato. Os casos reservados variam dados, textos longos, cardinalidade e direção RTL, nas mesmas famílias funcionais das tarefas complexas. Esses controles sintéticos não comprovam desempenho de modelos.

Use `inteiro benchmark grade --grading benchmarks/evaluator/criteria/task-01.json --candidate <git-root> --json`. O candidato deve ter raiz Git própria, configuração INTEIRO e entrada `/src/index.html`. Paths relativos de candidato são resolvidos na raiz do dataset; paths absolutos podem indicar outro workspace. O comando não executa shell ou agente. `--dry-run` valida e planeja sem iniciar navegador, gravar relatório ou declarar aprovação (`not_run`, exit 7).

O schema `task-grading.schema.json` usa `kind=independent-task-criteria`: casos, viewport, tema, densidade, direção e passos por roles/nomes, labels, texto ou test IDs publicados. Os passos verificam ações, estado, foco, ordem de listas, ausência de overflow e número/payload de chamadas de API. `task-fixture.schema.json` fixa clock UTC, seed de `Math.random` e planos de respostas; releases explícitos permitem testar loading/erro/retry sem sleeps. Envios com payload declarado exigem JSON. Não há execução de JavaScript arbitrário nos critérios.

O servidor local serve somente `src`, `public` e assets públicos do INTEIRO. Configuração, Git e arquivos do avaliador não são publicados. O navegador bloqueia origens externas, WebSocket e service workers. Na execução normal, o recibo fica em `.inteiro/reports/<runId>/grading.json`, com hash do critério/fixture, fonte, commit, configuração, versão do navegador, cenários planejados/executados e falhas sanitizadas. Falha de ambiente é `error`; falha do candidato é `failed`. A execução confere se a fonte permaneceu igual durante o ensaio.

`npm run test:benchmark-grading` testa referências reservadas ao avaliador, starters incompletos e defeitos conhecidos. As referências e os critérios não devem entrar no contexto do modelo avaliado. Um recibo funcional não substitui os gates de contexto, lint, navegador, revisão ou baseline aprovada.

### Preparação e edição isolada de candidatos

`inteiro benchmark prepare --case task-01 --target <novo-diretório> --json` copia apenas as fontes iniciais declaradas, instruções, fixtures públicas e contrato. O destino deve ser novo, fora das fontes do avaliador ou sob `artifacts/`. `--dry-run` planeja sem criar diretórios e retorna `not_run` (exit 7). Cada candidato recebe Git próprio e um recibo de integridade guardado fora dele, na raiz do avaliador. `inteiro benchmark worker-audit --worker <id> --json` confere controles, inventário, commit inicial e orçamento cumulativo de diff. O recibo é um controle do executor confiável, não uma assinatura de aprovação humana.

O export `@inteiro/evaluation/workspace` oferece `prepareBenchmarkWorker`, `auditBenchmarkWorker` e `runBenchmarkWorkerNode`. A última função executa somente Node em uma imagem Docker fixada por digest, sem pull automático. O operador precisa disponibilizar previamente a imagem indicada em `WORKER_IMAGE`. O container usa usuário sem privilégios, rede desabilitada, filesystem somente leitura, sem capabilities, limite de processos, CPU, memória, saída e tempo. Somente cada arquivo editável declarado recebe montagem de escrita; diretórios e controles permanecem somente leitura. Isso impede criar arquivos extras ou substituir controles por renomeação. O limite físico é 128 KiB por arquivo; a auditoria também limita a soma das fontes a 128 KiB antes de calcular o diff. Um timeout dispara a remoção do container nomeado e registra o resultado da limpeza. A execução grava recibos fora do candidato e não inicia modelos.

O harness externo deve oferecer essa função restrita ao executor, sem shell do host, credenciais ou socket Docker. As verificações usam `npm run test:worker-isolation`, incluindo tentativas reais de escrita proibida, rede, crescimento de arquivo e timeout; exigem Docker e a imagem já disponível. A preparação básica mantém `readyForValidation=false`. A materialização isolada não autoriza registrar uma observação como aceita.

Para instalar os pré-requisitos, acrescente `--bootstrap --packages-manifest artifacts/p0-package-manifest.json --dependency-lock <lock-v3> --harness pi|codex`. O manifesto deve fixar commit, hash das fontes e integridade SHA-512 dos onze pacotes, com os arquivos em `tarballs/` ao lado dele. O lock deve conter todas as dependências fixadas e fontes permitidas. `--npm-cli` e `--npm-cache` permitem selecionar o runtime e cache previamente disponíveis. A instalação executa `npm ci --offline --ignore-scripts`, sem lifecycle scripts. Cache incompleto interrompe a preparação e remove somente o novo candidato criado por ela.

A tarefa precisa declarar `validation: {path, sha256}` para um manifesto público versionado sob `benchmarks/validation/`. O schema `worker-validation` vincula rotas, estados, fixtures sintéticas e, opcionalmente, política de revisores com chaves públicas Ed25519. Critérios e referências privados do avaliador nunca são copiados. O bootstrap instala o harness, registra e verifica o contexto da tarefa, confere rotas, fixtures e fontes tipográficas e sela os controles. `readyForValidation=true` indica pré-requisitos preparados; `validationStatus=not_run` continua explícito até executar os gates e o grading. Não indica aceite ou aprovação visual.

A política de revisores permanece protegida. Os diretórios operacionais de revisão e baseline podem receber artefatos do fluxo externo de validação; o executor Docker não recebe escrita nesses diretórios. A auditoria de arquivos não aprova esses artefatos: os gates verificam assinaturas e vínculos. Os testes de bootstrap usam fixtures isoladas e políticas sintéticas, sem criar aprovações. Os quarenta contratos públicos de validação do catálogo de produção ainda precisam ser publicados; o bootstrap recusa tarefas sem esse snapshot em vez de presumir cobertura.

Os critérios também verificam upload de arquivo real escolhido pelo navegador, estilos associados a tokens, texto exato, navegação entre URLs e recuperação de conexão abortada. IDs desconhecidos de requests e releases são recusados antes de iniciar o navegador, inclusive em dry-run. `expect-text` continua sendo uma verificação de conteúdo; `expect-exact-text` compara o texto inteiro. Valores vazios são permitidos para limpar campos e verificar estados vazios.

Um cenário pode declarar `zoomFactor: 1|2`. O executor usa uma extensão fixa do avaliador com [zoom nativo de abas do Chromium](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-setZoom), em um [contexto persistente isolado](https://playwright.dev/docs/chrome-extensions). O recibo registra fator consultado ao navegador, largura CSS e devicePixelRatio antes/depois, e recusa zoom sem reflow correspondente. O perfil temporário é removido ao encerrar. Isso exige o Chromium completo instalado pelo Playwright. A API aceita `assertionTimeoutMs` entre 500 e 30000 (padrão 3000) e registra o prazo no recibo; os autotestes de defeitos conhecidos usam prazo menor, sem reduzir o prazo das referências válidas. `npm run test:benchmark-grading -- --testNamePattern=reference` permite revalidar apenas os controles válidos depois de fortalecer critérios; a execução sem filtro cobre starters, referências e mutações.

### Vínculo de aceite e raiz de evidência por candidato

Uma observação `accepted=true` exige `gradingPath` e `gradingHash`, além de `evidencePath` e `evidenceHash`. O schema `task-grading-result.schema.json` cobre o recibo funcional. O importador confere o catálogo independente, critério e fixture atuais, tarefa, fonte, commit do candidato, configuração, versão do navegador e execução integral de cada cenário e passo. Quando há zoom declarado, confere também fator nativo e reflow. O commit do candidato precisa corresponder ao grading e aos gates; ele não é confundido com `idsCommit`, que identifica a biblioteca.

`workerId` resolve a raiz real pelo recibo guardado pelo avaliador, nunca por um path arbitrário fornecido pela observação. Assim, os artefatos relativos são lidos na raiz do candidato mesmo quando o agregador está em outro diretório. IDs não podem ser reutilizados entre amostras. Um aceite exige bootstrap completo, auditoria íntegra, fonte atual igual à validada e snapshot de grading igual ao usado na preparação. O protocolo congelado também exige `workerId` para amostras aceitas e confere o snapshot do dataset. Candidatos apenas materializados, com `readyForValidation=false`, não podem ser registrados como aceitos.

Registros legados sem `workerId` são conferidos na raiz de importação e permanecem descritivos, com `publicationReady=false`. A integridade dos recibos não certifica entrega de prompts, execução de modelos ou julgamento humano. O protocolo congelado confere também o commit da distribuição instalada e o hash do snapshot público de validação; candidatos sem bootstrap concluído não servem como prova de aceite.

### Custos por tarefa e eventos do harness

`costBreakdown` usa `schemaVersion=1.0`, `currency` (três letras maiúsculas) e quatro valores monetários: `modelTokens`, `tools`, `humanReview` e `infrastructure`. Cada componente é um número não negativo ou `null` explícito. `modelTokens` inclui os custos de todos os modelos usados na tarefa, inclusive revisão por modelo; `humanReview` representa trabalho humano. O produtor deve classificar cada cobrança uma vez.

`aggregateTaskCostEvents(currency, events)` de `@inteiro/evaluation/costs` agrega eventos com `id`, `category`, `currency` e `cost`. IDs duplicados e moedas divergentes são recusados. Uma categoria sem eventos ou com evento de custo desconhecido permanece `null`; um zero conhecido precisa ser informado explicitamente. O resultado contém o breakdown, subtotais conhecidos e hash dos eventos. `billingAttested=false` descreve a origem declarada desses valores.

A soma usa as representações decimais registradas e rejeita estouro numérico. Com todos os componentes conhecidos, o total é derivado; o campo original `cost=null` permanece no registro de entrada. Se um total também for declarado, ele precisa reconciliar com a soma. Com componentes parciais, um total declarado pode ser preservado, mas não pode ser menor que os componentes conhecidos. `accounting.totalTaskCost` fica `null` enquanto houver lacunas; `accounting.components` mostra cobertura, total e subtotal conhecido por categoria. `totalCost` mantém compatibilidade com registros legados de total declarado, identificados por `legacyObservations` e moeda `null`.

As estatísticas agrupam modelo, ablação e moeda. Mediana e P90 de custo usam os totais conhecidos, com `costKnownObservations` indicando a cobertura. O protocolo congelado exige quatro componentes conhecidos na mesma moeda do orçamento e aplica `maxCost` ao total calculado. O CSV inclui `currency`, `total_task_cost`, `model_token_cost`, `tool_cost`, `human_review_cost` e `infrastructure_cost`; campos desconhecidos ficam vazios.

`tokensPerAcceptedTask` divide todos os tokens registrados, inclusive os gastos em falhas, pelo número de tarefas aceitas. Uso desconhecido mantém o total e a razão como `null`; `knownTokenSubtotal` expõe apenas o que foi registrado. Contagens inválidas e somas que perdem precisão inteira são recusadas. `timeToAcceptedMedian` e `timeToAcceptedP90` usam `durationMs` somente das tarefas aceitas. Esses cálculos não constituem resultado de um experimento real com modelos.

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

A conclusão de um reparo exige os cinco gates (`context`, `task-context`, `static`, `browser`, `review`), sem duplicatas, vinculados ao commit, fonte atual, configuração e recibo da tarefa. Lint precisa de cobertura integral em `enforce-all`; o navegador precisa comprovar a matriz declarada de rotas/estados/viewports/temas/densidades e ações de screenshot intermediário, com artefatos íntegros. A revisão qualitativa é conferida novamente contra a política e as assinaturas atuais. Um callback `full` que devolva somente lint, capturas incompletas ou evidência antiga bloqueia a conclusão e reverte o patch; `reason=incomplete-full-validation` e `acceptanceFailure` explicam a causa. Um relatório inicial marcado `passed` passa pelas mesmas verificações. O transporte também recusa findings omitidos, duplicados ou contraditórios com o status do gate.

O exemplo `examples/pi/repair-adapter.ts` consome a CLI com `spawn`, sem shell, valida schema/hash/status/código de saída e encaminha somente o envelope e fontes permitidas à função de proposta. Ele não usa hooks privados do Pi nem inicia modelos. O harness é responsável por fornecer o consumidor de propostas e impedir que ele escreva diretamente no projeto. A função `piDiagnosticsOnly` funciona sem IA.

## Matriz de release

Hashes de objetos usam ordenação lexical UTF-16 das chaves, sem depender do locale do sistema. Configurações resolvidas incluem `design.contract=@inteiro/design-system`. Após essa atualização, refaça os recibos com `context resolve --record`; decisões assinadas que não correspondam mais aos hashes devem voltar ao fluxo de revisão, sem aprovação automática. A mudança de hash não autoriza substituir goldens.

O hash de fontes inclui arquivos versionados e arquivos novos não ignorados pelo Git, sem uma whitelist de diretórios. Isso cobre `src`, assets públicos, componentes, configurações de raiz e outras estruturas de aplicações. Arquivos explicitamente listados no escopo da tarefa participam mesmo se ignorados pelo Git. Fontes removidas deixam de participar, antes ou depois de stage. Relatórios, revisões, recibos e backups operacionais ficam fora do hash; IDs derivados do recibo não alteram o conteúdo substantivo do plano. Estado de ferramentas ainda não versionado em `.codex`, `.cursor` e `.pi`, além de `.env*`, `.mcp.json` e `.ai-memory.toml` não é descoberto como fonte. Fontes privadas necessárias devem ser declaradas deliberadamente no plano, sem exportar seu conteúdo em evidências. Diretórios de saída personalizados devem ser ignorados pelo Git, para que relatórios não se tornem entradas de sua própria validação.

O perfil `release` adiciona o gate `release`: exige os 58 IDs de épicos, work packages, DoD e cenários, todos aprovados com evidências cujo hash corresponda aos arquivos. `release-evidence.json` registra o estado auditável e as exclusões solicitadas; sua presença sozinha não aprova a entrega. A matriz atual mantém as pendências de aceite explícitas.

A assinatura do mantenedor usa a política `.inteiro/reviewers.json`. O payload Ed25519 é `canonical({ledger, approval})`, onde `ledger` é o documento sem o campo `approval` e `approval` contém `reviewer`, `approvalRef`, `approvedAt` e `expiresAt`, sem `signature`. A assinatura Base64 fica em `approval.signature`. Ela vincula requisitos, evidências, versão, hash de fontes/configuração/política e exclusões. O agente não cria essa assinatura para a biblioteca; os testes usam somente chaves sintéticas temporárias.

Os modos de adoção são `static.adoption=observe|enforce-new|enforce-all`. Observe mantém o status real do relatório, mas permite saída não bloqueante do lint isolado. Enforce-new exige um baseline de diagnósticos com owner, justificativa, aprovação e expiração; findings novos continuam bloqueantes. Main, nightly e release recusam modos diferentes de enforce-all. O gate estrito do workflow permanece bloqueado enquanto faltarem referências ou revisões aprovadas.

`inteiro lint <path> --strict` promove avisos ativos a erros e bloqueia também no modo `observe`; exceções e baseline autorizados continuam sujeitos às regras existentes. `--fix-dry-run` executa o lint e devolve o preview sem criar relatórios, backups ou alterações. O código de saída continua representando o lint executado.

Para corrigir declarações CSS, use `--fix-dry-run --mapping <policy.json>` e inspecione `gates[0].autofix`, que contém o diff e `planHash`. Depois aplique `--fix --mapping <policy.json> --plan-hash <hash>`. A política usa o mesmo schema de migração: valor, token semântico, arquivos, seletores, propriedades, responsável, justificativa e referência da decisão. O comando verifica o plano atual, mantém backups e preserva a formatação. Repetir um plano já aplicado não produz outra edição. `--dry-run` sempre impede a aplicação. Sem mappings, `--fix` não inventa substituições e retorna o resultado normal do lint. Mappings exigem um caminho explícito e não se combinam com `--changed`; a CLI recusa essa combinação para evitar ampliar o escopo de escrita.

## Tarballs com runtime JavaScript

Use `npm run pack:p0` para gerar a distribuição instalável em `artifacts/tarballs`. O staging transpila fontes para JavaScript e ajusta os exports dos tarballs, preservando os exports de fonte no workspace. Isso evita a restrição de type stripping do Node dentro de `node_modules`. `npm run smoke:offline -- --seed-cache` prepara o cache uma vez e comprova reinstalação offline, consulta de tokens/padrões, instalação/verificação do contexto Pi e ferramentas MCP no consumidor isolado. `npm run smoke:offline` reutiliza o cache preparado.
