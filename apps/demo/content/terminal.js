// Gerado por scripts/generate-terminal.mjs
export const terminalPages = [
  {
    "id": "components/terminal",
    "title": "INTEIRO Terminal",
    "lede": "Gramática portátil de componentes e interação. Contrato 1.0.0; adoção optativa no IDS 1.3.0.",
    "status": "implementação em qualificação",
    "source": "@inteiro/terminal · docs/terminal/",
    "keywords": [
      "cli",
      "tui",
      "terminal",
      "pi",
      "menu",
      "teclado"
    ],
    "sections": [
      {
        "id": "contrato",
        "title": "Estrutura e interação",
        "html": "<p>Informação usa saída linear; uma escolha curta usa prompt; configurações usam painel; exploração persistente pode usar workspace. Hosts controlam streams e lifecycle. Não abrir janela externa por padrão.</p><p>Editar altera rascunho; salvar valida e persiste. Efeitos externos exigem ações distintas. Foco, seleção e erro são legíveis sem cor.</p>"
      },
      {
        "id": "qualificacao",
        "title": "Evidências e limites",
        "html": "<p>Estado, teclado, células e PTY possuem verificações distintas. A implementação não certifica leitores de tela nem plataformas sem evidência real. Consulte docs/terminal/qualification.json.</p>"
      },
      {
        "id": "componentes",
        "title": "Catálogo de componentes",
        "html": "<h3>TerminalPanel</h3><p>Organizar contexto, estado, conteúdo, feedback e ações</p><pre><code>TerminalPanel(options)</code></pre><p>Tab alterna regiões; Esc volta. Cinco regiões em linhas novas. Rolagem preserva foco e ações; abaixo de 40×12 oferecer linear.</p>\n<h3>MenuList</h3><p>Distinguir valores, rotas, ações e estados</p><pre><code>MenuList(items, focusedId)</code></pre><p>Setas limitadas nas extremidades; Enter ativa. Escolhas numeradas e motivo de indisponibilidade. Manter item focado visível.</p>\n<h3>SettingsList</h3><p>Separar persistido, rascunho e efetivo</p><pre><code>SettingsList(session, columns)</code></pre><p>Enter edita; Esc abandona campo; salvar é explícito. Valores atuais e origem em linhas. Valor sob rótulo em largura compacta.</p>\n<h3>TextInput</h3><p>Editar texto com rótulo e validação</p><pre><code>TextInput(label, value, error)</code></pre><p>Colagem é dado; ? é texto; Enter valida. Linha com :voltar para abandonar. Editor nativo rola; valor integral disponível.</p>\n<h3>SecretInput</h3><p>Receber segredo sem exposição</p><pre><code>SecretInput(label, error)</code></pre><p>Editor mascarado; sem eco nem resumo. Requer canal sem eco; nunca pedir em canal com eco. Nunca medir ou mostrar segredo como resumo.</p>\n<h3>Select</h3><p>Escolher um valor sem confundir foco e seleção</p><pre><code>Select(label, choices, focusedId, selectedId)</code></pre><p>Setas movem; Enter confirma rascunho; Esc abandona. Opções numeradas; valor atual indicado. Lista rola mantendo foco.</p>\n<h3>MultiSelect</h3><p>Marcar vários valores e concluir</p><pre><code>MultiSelect(label, choices, focusedId, selected)</code></pre><p>Espaço marca; Enter conclui; Esc abandona. Números separados por vírgula. Contagem e seleção preservadas.</p>\n<h3>SearchField</h3><p>Filtrar sem executar ações por digitação</p><pre><code>SearchField(query, count)</code></pre><p>Enter aplica filtro; vazio limpa; Esc abandona. Pergunta de filtro; sem resultados distinto de vazio. Filtro e posição preservados ao voltar.</p>\n<h3>ActionBar</h3><p>Manter ações alcançáveis sem atalhos</p><pre><code>ActionBar(actions, focusedId)</code></pre><p>Tab acessa ações; Enter ativa. Ações numeradas ou comandos rotulados. Ações quebram em linhas.</p>\n<h3>KeyHints</h3><p>Mostrar somente bindings resolvidos</p><pre><code>KeyHints(bindings, actions)</code></pre><p>Mesmo registro usado para despacho. Rótulos sem atalho se indisponível. Quebrar hints sem cortar tecla.</p>\n<h3>Breadcrumbs</h3><p>Orientar seções e retorno</p><pre><code>Breadcrumbs(parts)</code></pre><p>Movimento não navega. Caminho textual. Quebrar caminho; evitar profundidade desnecessária.</p>\n<h3>ConfirmAction</h3><p>Revisar objeto, destino e consequência</p><pre><code>ConfirmAction(object, consequence, destination, label)</code></pre><p>Modal tem precedência; Esc retorna. Decisão explícita com verbos concretos. Conteúdo completo em linhas.</p>\n<h3>ChangeSummary</h3><p>Revisar diferenças sem executar</p><pre><code>ChangeSummary(session.changes, scope)</code></pre><p>Execução é ação separada. Antes/depois com segredos ocultos. Quebrar diferenças e manter escopo.</p>\n<h3>StatusMessage</h3><p>Informar fato, causa e recuperação</p><pre><code>StatusMessage(kind, message, next)</code></pre><p>Mensagem não captura foco. Texto inclui status sem cor. Quebra em linhas; sem toast efêmero.</p>\n<h3>Progress</h3><p>Mostrar progresso real e cancelabilidade</p><pre><code>Progress(label, state, completed, total, cancellable)</code></pre><p>Esc solicita cancelamento sem prometer rollback. Atualizações append-only; percentual só com total. Etapa e estado preservados.</p>\n<h3>TaskList</h3><p>Apresentar etapas e resultados</p><pre><code>TaskList(tasks)</code></pre><p>Leitura e cancelamento via ação própria. Uma etapa por linha. Lista rola; resultado final permanece.</p>\n<h3>ResultList</h3><p>Explorar lista e detalhe preservando seleção</p><pre><code>ResultList(items, focusedId, detail, columns)</code></pre><p>Setas navegam; Enter abre detalhe. Registros sequenciais. Detalhe lateral em 120; empilhado abaixo.</p>\n<h3>DetailView</h3><p>Expor valor integral e atributos</p><pre><code>DetailView(label, fields)</code></pre><p>Esc volta sem mudar seleção. Rótulo e valor completos. Quebrar conteúdo sem truncamento definitivo.</p>\n<h3>DataTable</h3><p>Comparar registros com ordem anunciada</p><pre><code>DataTable(table, columns, linear)</code></pre><p>Consumidor oferece ação de ordenar e detalhe. Todos os campos por registro. Prioridade de colunas; compacta vira registros.</p>\n<h3>LogView</h3><p>Acompanhar logs com memória limitada</p><pre><code>LogView(log)</code></pre><p>Ações Pausar, Retomar, Exportar explícitas. Texto exportável sem decoração. Histórico limitado e perdas anunciadas.</p>\n<h3>EmptyState</h3><p>Distinguir vazio, filtro e indisponibilidade</p><pre><code>EmptyState(kind, next)</code></pre><p>Não bloquear ajuda e diagnóstico. Motivo e próximo passo. Texto quebra integralmente.</p>\n<h3>ErrorState</h3><p>Preservar contexto e oferecer recuperação</p><pre><code>ErrorState(message, next)</code></pre><p>Repetir só após resultado conhecido. Mensagem e recuperação persistentes. Texto completo; nunca só cor.</p>\n<h3>HelpView</h3><p>Expor ações efetivas, modo e saída</p><pre><code>HelpView(mode, bindings)</code></pre><p>Bindings do registro; Esc fecha ajuda. Ajuda em linhas sem redesenho. Rolagem para textos longos.</p>"
      }
    ]
  }
]
;
