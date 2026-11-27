# INTEIRO Terminal — discovery e proposta para o IDS 1.3.0

| Campo | Valor |
| --- | --- |
| Identificador | RFC-TERM-001 |
| Revisão deste documento | 0.1.0 |
| Estado | Proposta de discovery; implementação e adoção pendentes |
| Data da pesquisa | 19/11/2026 |
| Base examinada | IDS 1.2.0, branch `develop`, commit `0d13e97` |
| Release proposta do IDS | 1.3.0, aditiva e com adoção explícita |
| Contrato Terminal proposto | 1.0.0, a estabilizar antes da implementação pública |
| Entrega desta etapa | Pesquisa, decisões recomendadas, contratos preliminares e plano |

## 1. Recomendação

Adicionar ao IDS a superfície **INTEIRO Terminal**: uma gramática de componentes, composição e comportamento para interfaces de terminal. A aplicação deve continuar reconhecível quando a cor estiver desligada, o terminal for estreito ou o renderer mudar.

O padrão deve definir como um menu abre, como apresenta valores e ações, onde o foco fica, como editar e salvar, como voltar, como uma operação informa progresso e como a pessoa recupera uma falha. Identidade cromática entra como tradução opcional desses significados para o ambiente.

**Resposta sobre “abrir uma janela”:** menus simples ficam no fluxo do terminal. Configurações recorrentes usam um painel local. Uma aplicação persistente de exploração pode usar tela cheia no mesmo terminal. Uma extensão usa a superfície oferecida pelo host. Abrir outra janela do sistema operacional exige uma finalidade específica e uma ação explícita.

A recomendação é incorporar esse contrato como uma extensão compatível na futura release **IDS 1.3.0**. Nenhuma versão foi alterada nesta etapa.

## 2. O que o discovery encontrou

### Evidências locais

| Evidência | Achado | Implicação |
| --- | --- | --- |
| [Manifesto do IDS](C:/Users/felip/Desenvolvimento/IDS/package.json) e [README](C:/Users/felip/Desenvolvimento/IDS/README.md:11) | A versão declarada é 1.2.0. | Usar 1.2.0 como base e 1.3.0 como destino proposto. |
| [Arquitetura](C:/Users/felip/Desenvolvimento/IDS/docs/ARCHITECTURE.md:20) | O núcleo é independente de framework e harness. | Repetir essa separação no terminal. |
| [Governança](C:/Users/felip/Desenvolvimento/IDS/docs/GOVERNANCE.md:13) | Componentes compatíveis são minor; mudança incompatível de interação é major. | Adicionar uma superfície optativa é minor; migrar consumidores precisa de análise própria. |
| [Marca](C:/Users/felip/Desenvolvimento/IDS/docs/BRAND.md:1) | Estrutura, precisão, silêncio e decisão; violeta escolhe, laranja torna real. | Priorizar hierarquia e distinção entre escolher e executar. |
| [Catálogo de tokens](C:/Users/felip/Desenvolvimento/IDS/packages/tokens/source/catalog.json) | Existem papéis de texto, foco, seleção, identidade e status. | Reutilizar significados; evitar uma segunda paleta independente. |
| [Padrão Pi](C:/Users/felip/Desenvolvimento/workspace/docs/pi-extension-standard.md:7) | Painel com valores atuais, rascunho, salvamento explícito, navegação e recuperação. | Há um contrato local aproveitável, ainda ligado ao Pi. |
| [Template Pi](C:/Users/felip/Desenvolvimento/workspace/templates/pi-extension/settings-panel.ts:1) | Já usa tema do host, medição em células, overlay, cancelamento e limpeza. | É referência de comportamento e um candidato a piloto; sua equivalência ao contrato futuro precisa ser verificada. |
| [Adaptador Pi do IDS](C:/Users/felip/Desenvolvimento/IDS/packages/adapter-pi/package.json:1) | O pacote atual instala skills; não constitui uma biblioteca de widgets de terminal. | Criar uma integração de UI claramente separada desse papel. |
| [CLI existente](C:/Users/felip/Desenvolvimento/IDS/docs/CLI.md:1) | Já possui comandos, JSON e códigos de saída próprios. | O novo padrão deve preservar esses contratos e servir também a outros produtos. |

**Lacuna identificada no material examinado:** o IDS possui contratos e implementações orientados à web; o harness possui um padrão específico de menus Pi. Falta um contrato Terminal portátil que conecte esses conhecimentos e possa ser adotado por aplicações independentes.

Esta conclusão vem da leitura do repositório, dos contratos do harness e do template. Não representa auditoria completa das extensões instaladas nem comprovação de como todas renderizam hoje. Não houve entrevista, teste de usabilidade, execução de TUI ou medição de desempenho. Dimensões e limites recomendados abaixo são hipóteses de projeto a validar em pilotos.

### Referências externas e o que sustentam

| Fonte primária | Achado relevante |
| --- | --- |
| [Command Line Interface Guidelines](https://clig.dev/#interactivity) | Prompts dependem de contexto interativo e precisam de alternativa por argumentos. O guia também separa resultado em stdout de mensagens em stderr. |
| [Microsoft: Alternate Screen Buffer](https://learn.microsoft.com/en-us/windows/console/console-virtual-terminal-sequences#alternate-screen-buffer) | Tela alternativa ocupa a janela atual e não tem a região de scrollback do buffer principal. Isso fundamenta reservar tela cheia para tarefas adequadas. |
| [Node 22: TTY](https://nodejs.org/docs/latest-v22.x/api/tty.html) | Existem informações de TTY, dimensões, resize e capacidades de cor. Em raw mode, Ctrl+C deixa de gerar SIGINT automaticamente. A implementação deve tratar esse caso. |
| [NO_COLOR](https://no-color.org/) | Variável presente e não vazia solicita ausência de cor por padrão; o padrão não desliga automaticamente negrito e outros atributos. |
| [GNU Coreutils: controle de entrada](https://www.gnu.org/software/coreutils/manual/coreutils.html) | XON/XOFF pode usar Ctrl+S/Ctrl+Q. A disponibilidade dessas teclas não deve ser presumida em todos os ambientes. |
| [Kitty: protocolo de teclado](https://sw.kovidgoyal.net/kitty/keyboard-protocol/) | Protocolos legados têm combinações indistinguíveis, como Tab/Ctrl+I. Atalhos sofisticados precisam de detecção e alternativa. |
| [Pi: Terminal UI](https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/tui.md) e [Extensions](https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/docs/extensions.md) | O host oferece diálogos, widgets e UI customizada. Usa ações de teclado com namespaces e componentes próprios. |
| [Inquirer](https://github.com/SBoudrias/Inquirer.js) | Oferece prompts, streams configuráveis e cancelamento; cancelamento de prompt precisa de tratamento para não virar stack trace ao usuário. |
| [Ink: acessibilidade](https://github.com/vadimdemedes/ink#screen-reader-support) | Possui suporte básico a leitores de tela e um subconjunto de semântica ARIA. Usar a biblioteca não certifica a aplicação. |
| [Textual: telas](https://textual.textualize.io/guide/screens/) e [teclado](https://textual.textualize.io/guide/input/) | Demonstra telas, modais, foco e bindings associados a ações. É uma referência útil para separar contrato de implementação em outra linguagem. |
| [Unicode UAX #11](https://www.unicode.org/reports/tr11/) | East Asian Width isoladamente não resolve o layout de terminais modernos. Medição precisa considerar as particularidades do renderer e do terminal. |
| [W3C WCAG2ICT](https://www.w3.org/TR/wcag2ict-22/) | Fornece orientação informativa para aplicar princípios WCAG a software fora da web. Não cria uma certificação automática de TUI. |

As decisões das próximas seções são recomendações de projeto derivadas dessa pesquisa e do contexto local. As fontes não prescrevem o catálogo, os nomes ou as dimensões propostos para o INTEIRO.

## 3. Necessidades que o padrão deve atender

| Situação | Resultado esperado |
| --- | --- |
| Configurar uma extensão | Ver valores atuais, editar sem persistir por acidente, salvar e continuar no painel. |
| Usar uma ferramenta independente | Entender navegação e ações com as mesmas convenções aprendidas nas extensões. |
| Revisar uma ação com efeito externo | Identificar objeto, destino e consequência antes de executar. |
| Acompanhar uma tarefa | Saber o que está em andamento, o que terminou e se ainda é possível cancelar. |
| Usar shell, pipe ou automação | Obter saída estável sem menus inesperados ou bloqueio aguardando teclado. |
| Usar terminal estreito ou tecnologia assistiva | Concluir a tarefa com texto linear e controles explícitos. |

O terminal, a fonte, o tamanho de letra e as preferências de contraste pertencem ao ambiente do usuário. O padrão precisa funcionar com essas escolhas.

## 4. Quando usar cada formato

| Formato | Uso | Regra proposta |
| --- | --- | --- |
| Saída linear | Status, resultado, ajuda, diagnóstico, logs e automação | Texto que permanece no histórico; sem tomar controle da tela. |
| Prompt no fluxo | Uma escolha, confirmação ou pequeno conjunto de perguntas | Resolução curta, com resumo final no histórico. |
| Painel local | Configurações, vários valores relacionados e ações contextuais | Cabeçalho, corpo, ajuda contextual, feedback e rodapé de ações. |
| Workspace em tela cheia | Exploração persistente, listas extensas, detalhe ou monitoramento | Entrada deliberada; buffer alternativo quando disponível e adequado; saída clara. |

**Dentro de um host**, esses formatos são apresentados pelas APIs dele. Um painel Pi pode ser um overlay nativo; a extensão não abre seu próprio buffer alternativo nem toma posse dos streams do processo.

A árvore de decisão é: apresentar informação → saída linear; pedir uma escolha curta → prompt; editar um conjunto relacionado → painel; trabalhar continuamente sobre várias regiões → workspace. Quantidade de itens, sozinha, não justifica tela cheia.

Uma moldura não define um componente. Bordas são opcionais e econômicas; painéis aninhados, banners grandes e caixas em todo texto aumentam ruído. Um modal é reservado a uma decisão que interrompe temporariamente a tarefa, não a qualquer menu.

**Conclusão sobre janelas:** não abrir janela externa por padrão. Uma “janela dentro do terminal” é apenas uma composição local ou um overlay do host. Tela cheia é uma variante distinta, com custo para histórico, seleção de texto e orientação.

## 5. Anatomia e organização de menus

Todo painel tem cinco regiões, na mesma ordem:

1. **Contexto:** produto, seção e escopo atual; breadcrumb apenas quando houver navegação.
2. **Estado:** configuração efetiva e indicador textual de alterações pendentes.
3. **Conteúdo:** opções, campos ou registros; foco visível e estável.
4. **Ajuda e feedback:** descrição do item atual e resultado da última ação.
5. **Ações disponíveis:** rótulos e atalhos reais no contexto atual.

O menu raiz apresenta as tarefas e os valores relevantes do produto. Para configurações, abrir diretamente o painel de valores é melhor que obrigar a pessoa a atravessar uma página “Configurações”. Diagnóstico e ajuda permanecem alcançáveis quando uma dependência está indisponível.

Agrupar por intenção do usuário, com rótulos concretos: “Conexões”, “Limites”, “Histórico” ou “Diagnóstico”, conforme o domínio. Evitar taxonomias internas como “Adapters” ou “ProvidersRegistry”. Recomenda-se até dois níveis abaixo da raiz; ultrapassar isso deve motivar revisão de agrupamento e busca, não um limite artificial de funcionalidades.

Cada linha identifica claramente seu tipo: valor editável, destino de navegação ou ação. Um estado descritivo não parece acionável. Ações de execução são separadas dos campos. A ordem é estável; voltar restaura foco, filtro e posição da lista.

Na primeira abertura, um seletor foca o valor atual; um menu foca o primeiro item utilizável e seguro. Por padrão, listas param nas extremidades, sem saltar do último item para o primeiro. Em listas filtráveis, oferecer busca visível quando a quantidade dificultar encontrar um item; o limiar inicial candidato é mais de dez itens. Essas escolhas são parte do novo perfil, sujeitas à migração explícita quando diferirem do host ou de componentes existentes.

### Exemplo de painel em largura normal

```text
Ferramenta / Configurações
Escopo: projeto atual · Alterações não salvas

> Conexão                  Local
  Idioma                   Português
  Limite de tarefas        3
  Testar conexão           Abrir ação
  Diagnóstico              Abrir seção

Conexão usada por este projeto.
Teste usa o rascunho; salvar é uma ação separada.

  [Salvar alterações]  [Ajuda]  [Fechar]
Cima/baixo navegar · Enter editar/abrir
Ctrl+S salvar (se disponível) · Esc voltar
```

O texto “se disponível” explica a proposta; a interface real mostrará somente o binding efetivamente resolvido. As ações visíveis são alcançáveis por teclado mesmo quando o atalho não existe.

### Exemplo compacto: 40 colunas

```text
Ferramenta / Configurações
Projeto atual · Há alterações

> Conexão
  Local
  Idioma
  Português

1-2 de 5 itens
Conexão usada neste projeto.

[Salvar] [Ajuda] [Fechar]
Enter editar · Esc voltar
```

Em pouca altura, a descrição vira detalhe sob demanda e o corpo rola; contexto, item focado e caminho de saída continuam disponíveis. Abaixo da geometria mínima do painel, oferecer modo linear ou uma transição explícita que preserve o rascunho.

### Alternativa linear interativa

```text
Configurações — projeto atual
1. Conexão: Local
2. Idioma: Português
3. Salvar alterações
4. Ajuda
0. Voltar
Escolha uma opção:
```

Esse formato usa linhas novas, sem redesenhar a tela. Pode aceitar teclado em uma sessão interativa. É diferente de execução sem entrada, que não faz perguntas.

## 6. Catálogo inicial de componentes

Os nomes são candidatos de contrato, ainda não exports implementados. Cada componente deve especificar propósito, dados, ações, estados, foco, teclado, saída linear e comportamento sob resize.

| Componente | Contrato mínimo |
| --- | --- |
| `TerminalPanel` | As cinco regiões, título, escopo, foco inicial e restauração de foco ao fechar. |
| `MenuList` | IDs estáveis, item focado, descrição, estado indisponível com motivo e indicador de posição. |
| `SettingsList` | Valor efetivo, valor do rascunho, origem/override quando relevante e erro junto ao campo. |
| `TextInput` / `SecretInput` | Rótulo permanente, valor atual, validação e colagem como dados; segredo sem eco ou reexibição em resumos. |
| `Select` | Seleção única distinta do foco; voltar sem aplicar escolha incompleta. |
| `MultiSelect` | Marcação explícita, contagem e ação de concluir; mover foco não marca itens. |
| `SearchField` | Filtro visível, limpeza explícita e estado sem resultados; digitação permanece no campo. |
| `ActionBar` / `KeyHints` | Ação principal, secundárias e bindings calculados do mesmo registro usado para tratar teclado. |
| `Breadcrumbs` | Localização e retorno entre seções; sem navegar pelo movimento do cursor. |
| `ConfirmAction` | Objeto, consequência, destino e opções com nomes concretos; ação segura inicialmente focada. |
| `ChangeSummary` | O que muda, escopo afetado e diferença entre salvar configuração e executar no mundo externo. |
| `StatusMessage` | Fato, causa quando conhecida e próxima ação; texto suficiente sem depender de cor. |
| `Progress` / `TaskList` | Etapa, trabalho conhecido, estado final e cancelabilidade; percentual apenas com denominador real. |
| `ResultList` / `DetailView` | Lista e detalhe, seleção preservada, busca e alternativa empilhada em largura pequena. |
| `DataTable` | Cabeçalhos, prioridade de colunas, ordenação anunciada e conversão para registros lineares. |
| `LogView` | Pausa/retomada de acompanhamento, limite de histórico em memória e resultado exportável ou copiável sem decoração. |
| `EmptyState` / `ErrorState` | Distinguir ausência de dados, filtro sem resultados, indisponibilidade e falha. |
| `HelpView` | Ações disponíveis, atalhos efetivos, modo atual e forma de sair. |

Paleta de comandos, árvore complexa, abas e dashboards são extensões posteriores do catálogo. O padrão completo prevê esses padrões, mas sua implementação deve ser motivada por um consumidor real, não por equivalência automática com uma biblioteca web.

**Foco, seleção e edição são estados diferentes.** `>` indica foco; `(x)` ou `[x]` indicam seleção; texto e cursor indicam edição. Um item indisponível exibe o motivo e pode ser inspecionado, sem executar sua ação.

## 7. Teclado e precedência

O contrato padroniza ações semânticas: `navigate.up`, `navigate.down`, `activate`, `back`, `save`, `help`, `cancelOperation` e `close`. Teclas são bindings do renderer e do host. Nenhuma função essencial depende exclusivamente de uma combinação opcional.

| Tecla padrão candidata | Comportamento |
| --- | --- |
| Cima / baixo | Mover foco dentro da lista; manter o item visível. |
| Enter em item | Abrir, editar ou ativar o item focado. |
| Enter em campo de uma linha | Validar o campo e atualizar o rascunho; ainda não persistir. |
| Espaço | Alternar marcação somente em checkbox ou seleção múltipla. |
| Tab / Shift+Tab | Alternar grupos de foco quando há mais de uma região; em editor, respeitar o contrato dele. |
| Esc em edição/submenu | Abandonar a edição incompleta ou voltar um nível. |
| Esc no painel limpo | Fechar o painel e devolver foco ao ponto de entrada. |
| Esc no painel alterado | Abrir decisão de alterações pendentes. |
| Esc em operação cancelável | Solicitar cancelamento; manter feedback e aguardar resultado. |
| Home / End, PageUp / PageDown | Navegar listas quando disponíveis; fornecer alternativa pela navegação básica. |
| F1 ou `?` em navegação | Abrir ajuda se disponível; `?` digitado em campo continua sendo texto. |
| Ctrl+S | Salvar somente quando o ambiente entregar essa tecla; ação visível “Salvar” sempre disponível. |
| Ctrl+C em CLI independente | Interromper com limpeza e retorno ao shell; não salvar implicitamente. |
| Ctrl+C dentro de host | Respeitar as regras de interrupção do host; nunca encerrar o processo hospedeiro. |

Setas laterais ficam disponíveis para edição textual e controles que tenham esse significado. `q`, `j/k`, Ctrl+P e combinações Alt não são requisitos universais: podem existir como preferências documentadas. Ctrl+D/EOF e Ctrl+Z não devem receber funções globais que conflitem com shell/host.

Antes do despacho, o adaptador respeita as teclas reservadas pelo host. Nas teclas cedidas ao painel, a precedência é modal ativo, campo focado e contexto do painel. Colagem é tratada como entrada de dados, sem disparar comandos globais por caracteres colados.

Em raw mode, o renderer standalone precisa reconhecer interrupção explicitamente, pois o terminal pode não gerar SIGINT. Essa obrigação vem do comportamento documentado em [Node 22 TTY](https://nodejs.org/docs/latest-v22.x/api/tty.html#readstreamsetrawmodemode).

### Conciliação com o Pi atual

O contrato local define Ctrl+S e descarte por segundo Esc. O template também contém hints literais de teclado, embora consulte bindings do host para parte das ações. A proposta é gerar todos os hints a partir do mapa efetivo e manter Ctrl+S no perfil Pi quando disponível.

Para **novos componentes**, recomenda-se uma decisão explícita de descarte: “Continuar editando”, “Salvar e fechar” e “Descartar alterações”, inicialmente focada em continuar. Esc nessa decisão volta à edição. Isso reduz a ambiguidade de pressionar Esc duas vezes.

Alterar o comportamento das extensões existentes exige uma migração deliberada do contrato do harness e de cada produto. O IDS 1.3.0 pode adicionar esse perfil de forma optativa; não deve reescrever os consumidores nem declarar que o padrão antigo mudou automaticamente. Se a alteração quebrar um contrato público de um consumidor, seu versionamento deve refletir isso.

## 8. Rascunho, salvamento, operações e recuperação

Manter separados três valores: **persistido**, **rascunho** e **efetivo** após overrides. Um override que impede a mudança aparece no campo, com sua origem. Editar um valor não remove overrides silenciosamente.

Fluxo de configurações:

```text
limpo -> edição -> rascunho alterado -> validação -> salvando -> limpo
                         |                |           |
                         |                +-> erro <--+
                         |                     |
                         +<-- corrigir rascunho-+
```

Salvar valida, persiste de forma atômica quando o armazenamento permite e mantém o painel aberto. Falha conserva o rascunho e direciona ao primeiro erro relevante. Ctrl+S durante edição, quando suportado, primeiro valida o campo e depois o conjunto inteiro; não salva o valor anterior silenciosamente.

Salvar é distinto de aplicar, publicar, executar ou excluir. Mudanças locais reversíveis não precisam de confirmação repetitiva. Operações de consequência relevante apresentam o objeto e o efeito concretos; ações destrutivas usam rótulo específico e foco inicial seguro. Em um resumo de mudanças, navegar ou selecionar nunca executa o commit.

Testes de conexão usam o contexto explicitamente indicado, como “Testar rascunho”, sem persistir como efeito oculto. IO começa após a ação, com progresso e timeout definido pelo produto.

Estados de operações: `idle`, `running`, `cancelling`, `succeeded`, `failed`, `cancelled` e `outcomeUnknown`. Cancelamento solicitado não equivale a desfazer um efeito remoto já aplicado. Se o resultado for desconhecido, informar “Confirmação não recebida” e oferecer consulta/reconciliação antes de repetir a ação.

Cada operação tem dono, sinal de cancelamento e proteção contra envio duplicado. Resultado atrasado não altera outro painel ou sessão. Durante espera, ajuda e cancelamento continuam acessíveis. Ao fechar, cancelar recursos pertencentes ao componente e executar cleanup; não interromper recursos que pertençam a outra parte do host.

## 9. Aparência, medidas e acessibilidade

### Estrutura antes de paleta

O perfil básico usa texto do terminal, ênfase moderada, marcadores e espaço. A aplicação continua compreensível em monocromia. No Pi, usar o tema do host, conforme o contrato local; em standalone, oferecer mapeamento opcional dos papéis do IDS.

| Significado | Token existente ou adaptação |
| --- | --- |
| Texto e texto auxiliar | `color.text.primary`, `color.text.secondary`; evitar texto ilegível por excesso de dim. |
| Escolha deliberada | `color.identity.primary`, quando o renderer oferece perfil de identidade. |
| Efeito externo | `color.identity.commit`, acompanhado de verbo, objeto e destino. |
| Foco | `color.focus.ring` como significado, traduzido para marcador/ênfase; não para borda de 2 px. |
| Seleção | `color.selection.background` quando adequado, sempre com marcador textual. |
| Resultado e alerta | `color.status.success`, `warning`, `danger`, `info`, sempre com mensagem. |

`NO_COLOR` remove cor; não implica execução sem entrada. Um modo linear sem controle de cursor é uma opção adicional. A política proposta é: escolha explícita da execução, preferência do usuário e detecção conservadora; ausência de cor nunca elimina informação.

Não é necessário criar novos tokens cromáticos na primeira entrega. Se faltarem significados recorrentes, propor extensões na fonte canônica com origem e governança. Dimensões em células e linhas devem ser políticas tipadas de layout, sem fingir que são medidas CSS em px/rem.

### Geometria candidata

| Condição | Composição recomendada |
| --- | --- |
| 40 colunas | Uma coluna; rótulo e valor podem ocupar linhas distintas. |
| 80 colunas | Rótulo e valor lado a lado quando legíveis. |
| 120 colunas ou mais | Detalhe lateral somente se a tarefa se beneficiar. |
| Altura reduzida | Reduzir descrição, rolar corpo e preservar foco e ações essenciais. |
| Conteúdo extenso | Quebrar texto; truncar apenas resumo, oferecendo valor completo acessível. |

Espaço básico: uma célula entre elementos próximos e uma linha entre grupos. A densidade `focus` reduz separações; `calm` acrescenta respiro. Esses nomes preservam a intenção do IDS, mas seus valores precisam de validação no terminal.

Medir largura renderizada, respeitar grafemas e testar acentos combinantes, CJK e emoji. Não cortar sequências ANSI nem tratar `string.length` como largura visual. O renderer é responsável por uma política coerente com os terminais suportados; [UAX #11](https://www.unicode.org/reports/tr11/) não resolve isso isoladamente.

### Acessibilidade proposta

- Todo fluxo funciona por teclado; foco, seleção, estado e erro possuem representação textual.
- Ajuda, erro e decisão relevante permanecem disponíveis; não dependem de toast efêmero.
- Modo linear interativo evita redesenho contínuo e aceita escolhas numeradas.
- Animações são dispensáveis. Preferência sem movimento usa texto de etapa e atualizações com frequência controlada.
- ASCII substitui símbolos decorativos quando solicitado; a conversão não translitera o conteúdo do usuário.
- Não exigir Nerd Fonts, emoji, fonte Recursive ou ligaturas para entender ou operar a interface.
- Não transplantar “44 px”, “320 px”, CSS/DOM ou um resultado axe para declarar acessibilidade de terminal. Esses critérios precisam de interpretação aplicável ao ambiente, usando [WCAG2ICT](https://www.w3.org/TR/wcag2ict-22/) como orientação.
- Validar com leitor de tela real e terminal identificado; o suporte básico documentado pelo [Ink](https://github.com/vadimdemedes/ink#screen-reader-support) não substitui esse ensaio.
- Localizar rótulos e testar texto longo. Suporte a scripts RTL depende do terminal; declarar a matriz comprovada e oferecer saída linear, sem prometer equivalência a RTL web.

## 10. Execução independente e automação

O renderer identifica capacidades: sessão interativa, canal de UI, dimensões, cor, Unicode, teclado avançado, mouse e controle de tela. Capacidades desconhecidas usam o caminho simples. Mouse é aprimoramento opcional e não captura seleção de texto por padrão.

Para **novos produtos**, a proposta recomenda controles equivalentes aos seguintes, com nomes a estabilizar no contrato: `--no-input`, `--json`, seleção explícita de UI e controle de cor. São requisitos de consumo do padrão, não comandos novos do binário `inteiro`.

| Contexto | Comportamento proposto |
| --- | --- |
| CI, entrada não interativa ou `--no-input` | Sem perguntas; entrada faltante gera erro acionável. |
| `--json` | Sem UI interativa; saída estruturada limpa, sem banners, ANSI ou progresso no mesmo stream. |
| stdout redirecionado | Por padrão, não abrir menu automaticamente. |
| Terminal simples ou capacidades insuficientes | Saída linear; prompts lineares apenas se o canal de entrada e o de interação forem utilizáveis. |
| Modo linear escolhido | Texto append-only, sem posicionamento de cursor; pode ser interativo. |
| Host | Usar canal e lifecycle do host; não escrever diretamente em stdout/stderr dele. |

Em standalone, resultado vai para stdout e UI/diagnósticos humanos para stderr. Exceções de um protocolo existente prevalecem: o CLI do IDS já possui convenções JSON e códigos próprios, que devem permanecer compatíveis. Essa separação de fluxos e o cuidado com prompts têm base nas [CLI Guidelines](https://clig.dev/#the-basics).

O núcleo retorna resultados tipados; o produto mapeia os códigos de saída. Para aplicações novas, documentar sucesso, falha, uso inválido e interrupção; 0/1/2 e 130 para interrupção são candidatos, sujeitos à plataforma e ao host. Nunca impor esse mapa retroativamente ao CLI atual.

O adaptador standalone restaura cursor, atributos, raw mode e buffer que ele próprio modificou, em saídas e erros tratáveis. Limpeza é uma garantia para caminhos controláveis, não para desligamento abrupto ou sinais que o sistema não permite interceptar. Conteúdo externo é sanitizado para não executar sequências de terminal, inclusive operações de clipboard ou título.

## 11. Arquitetura proposta

```text
Identidade e semântica do IDS
             |
Contratos Terminal + políticas de interação
             |
Estado e ações independentes de renderer
             |
  +----------+-------------+----------------+
  |                        |                |
Pi nativo            Prompts Node      Outros renderers
                     independente      Ink / Textual / Go
```

**Contrato antes de framework.** A especificação é independente de linguagem. Uma implementação de referência em TypeScript é conveniente para o ecossistema atual, sem obrigar futuros produtos em Python, Go ou Rust a executar Node.

Estrutura candidata no monorepo, a criar somente na implementação:

| Local proposto | Responsabilidade |
| --- | --- |
| `docs/terminal/` | Regras, catálogo, exemplos, decisões, consumo e migração. |
| `packages/contracts/schemas/terminal-*.schema.json` | Schemas aditivos de componentes, ações, capacidades e evidências; sem quebrar schemas web atuais. |
| `packages/terminal/` | Estado, validação de contratos, políticas de navegação e serialização de apresentação. |
| Entradas opcionais `@inteiro/terminal/pi` e `/prompts` | Tradução para Pi e renderer de prompts, com peers opcionais isolados. |
| `examples/terminal/` | Referência Pi e exemplo independente com a mesma tarefa e estados. |
| Fixtures e testes Terminal | Eventos de teclado, geometria, transcripts e evidência de execução real. |

Os nomes de pacote e exports são propostos. O núcleo não importa Pi, React, terminal ou bibliotecas de prompt ao ser carregado. IO, persistência, rede e regras do produto permanecem nos adapters do consumidor. Nenhum componente é descoberto por import de checkout vizinho. Preservar o requisito atual de Node 22.14+ no núcleo; conferir engines e peers ao selecionar versões dos renderers, sem elevar o requisito de todo o IDS por uma integração opcional.

Metadados mínimos de um componente: ID e versão, propósito, itens/campos com IDs estáveis, estado, ação semântica, valor atual, mensagem/ajuda, capacidades necessárias e alternativa linear. Ação inclui alcance e efeito; o renderer decide como apresentá-la, não se o produto tem autorização para executá-la.

Os contratos precisam ser recuperáveis pelos agentes. Na implementação, integrar catálogo, documentação e consultas existentes sem criar colisões de nomes com componentes web. O gate de contexto continua sendo a entrada para trabalho de UI, ampliado futuramente para reconhecer a superfície Terminal.

### Avaliação de opções

| Opção | Onde ajuda | Limite e decisão recomendada |
| --- | --- | --- |
| Pi nativo | Extensões existentes e respeito ao host | Primeiro adaptador de host; usar `ctx.ui` e componentes nativos quando atendem ao contrato. |
| Inquirer | Prompts e escolhas standalone | Candidato principal para a primeira referência independente; [API de cancelamento e streams](https://github.com/SBoudrias/Inquirer.js#advanced-usage) é útil. Painel persistente pode exigir composição além dos prompts prontos. |
| Clack | Fluxos guiados e mensagens encadeadas | Alternativa para onboarding. Avaliar aderência ao catálogo e liberdade de composição; suas [primitivas de prompt](https://bomb.sh/docs/clack/packages/prompts/) não definem o padrão inteiro. |
| Ink | Aplicações Node persistentes e composição React | Candidato caso o piloto standalone demande painel/workspace contínuo; não impor React ao núcleo. |
| Textual | Aplicações Python com telas e foco | Referência de portabilidade e candidato futuro, quando houver consumidor Python. |
| Novo renderer ANSI próprio | Controle total | Evitar como primeira escolha: amplia o trabalho de compatibilidade, teclado e acessibilidade sem evidência de necessidade. |

A seleção final do renderer independente deve seguir o piloto. O discovery recomenda candidatos e critérios; não afirma que uma prova de conceito já demonstrou equivalência.

## 12. Versionamento proposto

| Artefato | Versão / regra |
| --- | --- |
| Documento de discovery | RFC-TERM-001, revisão 0.1.0; mudanças registradas por revisão. |
| IDS existente | Permanece 1.2.0 nesta etapa. |
| Próxima entrega aditiva | IDS 1.3.0, se ainda for o próximo minor quando implementada. |
| Novos pacotes alinhados ao release train | 1.3.0, seguindo a convenção atual do monorepo; não há pacote publicado nesta etapa. |
| Contratos Terminal | Alvo 1.0.0 na estabilização, versionado separadamente da release do IDS. |
| Catálogo de tokens | Manter a versão vigente sem mudanças. Se forem necessários novos tokens, aplicar a política própria do catálogo. |
| Consumidores | Adoção optativa e migração explícita, por produto e superfície. |

Adicionar componente opcional ou binding alternativo compatível é minor. Corrigir overflow preservando comportamento é patch. Remover uma ação, mudar persistência implícita/explícita ou redefinir o significado de uma tecla contratada pode ser major, mesmo sem erro de tipos. A classificação segue a [governança local](C:/Users/felip/Desenvolvimento/IDS/docs/GOVERNANCE.md:13).

O changelog futuro deve registrar a nova superfície, os componentes disponíveis, plataformas verificadas, limitações e guia de adoção. Código disponível, ensaio técnico concluído e aprovação visual/usabilidade são estados diferentes.

## 13. Plano de implementação posterior

Todas as frentes abaixo estão **propostas, não executadas**.

| Frente | Entrega | Evidência para encerrar |
| --- | --- | --- |
| 1. Contrato | Anatomia, ações, estados, teclado, acessibilidade e schemas | Revisão com exemplos Pi e standalone, decisões e versões explícitas. |
| 2. Núcleo | Estado de foco, edição, rascunho, retorno e cancelamento | Testes das transições e isolamento de IO/renderer. |
| 3. Componentes de referência | Menu, configurações, entrada, seleção, ações, confirmação, feedback e progresso | Fixtures normal/compacta/linear e comportamento verificado. |
| 4. Integrações | Pi nativo e um consumidor independente | Mesma tarefa concluída nos dois ambientes sem perder o contrato. |
| 5. Padrões de dados | Lista/detalhe, tabela e logs; contrato de workspace | Piloto demonstra necessidade e mantém alternativa compacta/linear. |
| 6. Qualificação e adoção | Evidências Terminal, catálogo consultável, guias e release 1.3.0 | Matriz executada, revisão registrada e migração explícita dos pilotos. |

A implementação integral cobre as seis frentes. A ordem reduz decisões prematuras; componentes avançados entram conforme o piloto escolhido, sem serem declarados concluídos por existir uma especificação.

Primeiro piloto recomendado: painel de configurações inspirado no template Pi já existente. Segundo: ferramenta standalone com a mesma edição e uma operação cancelável. Escolher o produto independente é uma decisão em aberto; criar um novo produto apenas para provar o design system adicionaria trabalho desnecessário.

### Critérios verificáveis propostos

| ID | Critério de aceite futuro |
| --- | --- |
| TERM-01 | Abrir configurações apresenta valores atuais e escopo; nenhuma rede é necessária para a primeira apresentação utilizável. |
| TERM-02 | Navegar, abrir seção e voltar preservam valores e não persistem nem executam efeitos externos. |
| TERM-03 | Editar e confirmar campo modifica apenas rascunho; salvar valida o conjunto, informa resultado e mantém painel. |
| TERM-04 | Falha de salvamento preserva rascunho; fechar com alterações exige decisão explícita conforme o perfil adotado. |
| TERM-05 | Foco, seleção, erro, indisponibilidade e progresso são distinguíveis em monocromia. |
| TERM-06 | Remapear teclado atualiza comportamento e hints; uma ação essencial continua acessível sem Ctrl+S. |
| TERM-07 | Operação informa progresso, evita duplicidade e distingue cancelamento solicitado, confirmado e resultado desconhecido. |
| TERM-08 | Resize preserva foco/rascunho; conteúdo e saída continuam alcançáveis em 40, 80 e 120 colunas. |
| TERM-09 | Acentos, caracteres combinantes, CJK, emoji e conteúdo com escapes não corrompem largura ou executam controles externos. |
| TERM-10 | Sem TTY/sem entrada/JSON não há prompt, animação ou bloqueio; protocolo estruturado continua limpo. |
| TERM-11 | Saída controlada e falha tratável restauram estado de terminal próprio e foco do host; não encerram o hospedeiro. |
| TERM-12 | O fluxo principal é completado com teclado e em alternativa linear, com revisão em leitor de tela identificado. |

Matriz inicial candidata: 40×12, 80×24 e 120×36; resize durante edição e operação; claro/escuro/monocromia; ASCII; sem movimento; interrupção; EOF; dependência indisponível e save com erro. Priorizar Windows Terminal com PowerShell pelo ambiente atual e um Linux/WSL, incluindo passagem por SSH/tmux quando fizer parte do uso. macOS permanece suporte a qualificar, sem selo antecipado.

Evidência deve combinar testes de estado, eventos de teclado, snapshots de células/transcripts e smoke com terminal/host reais. Capturas ajudam a revisão visual, mas não comprovam sozinhas foco, cancelamento ou leitura assistiva.

O gate existente `npx inteiro gate run --profile pr --json` permanece parte da validação prevista após alterações. Deve-se propor cobertura Terminal própria: Browser Gate, DOM e axe não qualificam uma TUI. Antes de futuras edições de UI, executar a resolução de contexto exigida pelo AGENTS. Não promover baselines automaticamente nem usar o próprio agente como aprovação de referência.

## 14. Riscos, decisões pendentes e limites

| Ponto | Tratamento proposto |
| --- | --- |
| Tornar o padrão um tema obrigatório | Conformidade de estrutura e interação é verificável sem a paleta de identidade. |
| Copiar a interface web para terminal | Especificar células, streams, foco e capacidades; reaproveitar significados. |
| Divergir do Pi e disputar teclado | Integração nativa e bindings do host; migração explícita para qualquer alteração de contrato atual. |
| Prometer acessibilidade sem ensaio | Leitor de tela e modo linear na matriz; limites por plataforma documentados. |
| Criar framework grande antes de demanda | Contratos e dois pilotos; renderer existente sempre que atender. |
| “Cancelar” parecer rollback | Estados explícitos e reconciliação de efeitos externos. |
| Cor ou largura detectadas incorretamente | Overrides do usuário e fallback simples. |

Permanecem para a etapa de desenho detalhado: consumidor standalone de referência; renderer que melhor atende esse caso; plataformas de suporte inicial; regra de migração do segundo Esc no padrão Pi; e metadados públicos exatos de consulta dos componentes Terminal. São decisões localizadas, não impedimentos para a direção proposta.

## 15. Estado ao concluir este discovery

Foi produzida esta proposta com base em leitura local e pesquisa de fontes primárias. Os wireframes são exemplos textuais de design, não capturas de uma implementação.

Não houve alteração no repositório IDS, bump de versão, instalação de dependências, migração de extensão, execução de testes/gates de produto, criação de branch, commit, tag, publicação ou deploy. Este documento foi salvo fora do checkout para manter a etapa restrita ao discovery.

**Decisão recomendada para orientar uma implementação posterior:** IDS 1.3.0 incorpora INTEIRO Terminal como superfície optativa, com comportamento portátil, integração nativa com hosts e identidade visual adaptável. O contrato só será considerado entregue quando os pilotos e a matriz de evidências forem executados.
