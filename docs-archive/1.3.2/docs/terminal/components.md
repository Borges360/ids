# Catálogo INTEIRO Terminal 1.0.0

Gerado por `npm run generate:terminal`. As projeções retornam `View`; interação pertence aos modelos/controlador e ao renderer. Componentes puros não fazem IO.

## terminal.TerminalPanel

Organizar contexto, estado, conteúdo, feedback e ações.

- Estados: default, dirty, compact, linear.
- Foco: Primeiro item seguro; devolver foco ao chamador.
- Teclado: Tab alterna regiões; Esc volta.
- Linear: Cinco regiões em linhas novas.
- Resize: Rolagem preserva foco e ações; abaixo de 40×12 oferecer linear.

```ts
import { TerminalPanel } from '@inteiro/terminal';
TerminalPanel(options)
```

## terminal.MenuList

Distinguir valores, rotas, ações e estados.

- Estados: default, disabled, filtered, empty.
- Foco: Primeiro item seguro; indisponível é inspecionável.
- Teclado: Setas limitadas nas extremidades; Enter ativa.
- Linear: Escolhas numeradas e motivo de indisponibilidade.
- Resize: Manter item focado visível.

```ts
import { MenuList } from '@inteiro/terminal';
MenuList(items, focusedId)
```

## terminal.SettingsList

Separar persistido, rascunho e efetivo.

- Estados: clean, editing, dirty, saving, error, overridden.
- Foco: Erro aponta primeiro campo; salvar mantém painel.
- Teclado: Enter edita; Esc abandona campo; salvar é explícito.
- Linear: Valores atuais e origem em linhas.
- Resize: Valor sob rótulo em largura compacta.

```ts
import { SettingsList } from '@inteiro/terminal';
SettingsList(session, columns)
```

## terminal.TextInput

Editar texto com rótulo e validação.

- Estados: default, editing, error.
- Foco: Caret pertence ao editor nativo.
- Teclado: Colagem é dado; ? é texto; Enter valida.
- Linear: Linha com :voltar para abandonar.
- Resize: Editor nativo rola; valor integral disponível.

```ts
import { TextInput } from '@inteiro/terminal';
TextInput(label, value, error)
```

## terminal.SecretInput

Receber segredo sem exposição.

- Estados: editing, error.
- Foco: Campo com rótulo permanente.
- Teclado: Editor mascarado; sem eco nem resumo.
- Linear: Requer canal sem eco; nunca pedir em canal com eco.
- Resize: Nunca medir ou mostrar segredo como resumo.

```ts
import { SecretInput } from '@inteiro/terminal';
SecretInput(label, error)
```

## terminal.Select

Escolher um valor sem confundir foco e seleção.

- Estados: default, editing, disabled.
- Foco: Foco inicial no valor atual.
- Teclado: Setas movem; Enter confirma rascunho; Esc abandona.
- Linear: Opções numeradas; valor atual indicado.
- Resize: Lista rola mantendo foco.

```ts
import { Select } from '@inteiro/terminal';
Select(label, choices, focusedId, selectedId)
```

## terminal.MultiSelect

Marcar vários valores e concluir.

- Estados: default, editing, disabled.
- Foco: Mover foco não marca.
- Teclado: Espaço marca; Enter conclui; Esc abandona.
- Linear: Números separados por vírgula.
- Resize: Contagem e seleção preservadas.

```ts
import { MultiSelect } from '@inteiro/terminal';
MultiSelect(label, choices, focusedId, selected)
```

## terminal.SearchField

Filtrar sem executar ações por digitação.

- Estados: default, editing, empty.
- Foco: Texto permanece no campo.
- Teclado: Enter aplica filtro; vazio limpa; Esc abandona.
- Linear: Pergunta de filtro; sem resultados distinto de vazio.
- Resize: Filtro e posição preservados ao voltar.

```ts
import { SearchField } from '@inteiro/terminal';
SearchField(query, count)
```

## terminal.ActionBar

Manter ações alcançáveis sem atalhos.

- Estados: default, focused, disabled.
- Foco: Principal e secundárias em ordem estável.
- Teclado: Tab acessa ações; Enter ativa.
- Linear: Ações numeradas ou comandos rotulados.
- Resize: Ações quebram em linhas.

```ts
import { ActionBar } from '@inteiro/terminal';
ActionBar(actions, focusedId)
```

## terminal.KeyHints

Mostrar somente bindings resolvidos.

- Estados: default, remapped.
- Foco: Sem foco independente.
- Teclado: Mesmo registro usado para despacho.
- Linear: Rótulos sem atalho se indisponível.
- Resize: Quebrar hints sem cortar tecla.

```ts
import { KeyHints } from '@inteiro/terminal';
KeyHints(bindings, actions)
```

## terminal.Breadcrumbs

Orientar seções e retorno.

- Estados: root, nested.
- Foco: Voltar restaura foco, filtro e scroll.
- Teclado: Movimento não navega.
- Linear: Caminho textual.
- Resize: Quebrar caminho; evitar profundidade desnecessária.

```ts
import { Breadcrumbs } from '@inteiro/terminal';
Breadcrumbs(parts)
```

## terminal.ConfirmAction

Revisar objeto, destino e consequência.

- Estados: review, submitting, error.
- Foco: Opção segura inicialmente.
- Teclado: Modal tem precedência; Esc retorna.
- Linear: Decisão explícita com verbos concretos.
- Resize: Conteúdo completo em linhas.

```ts
import { ConfirmAction } from '@inteiro/terminal';
ConfirmAction(object, consequence, destination, label)
```

## terminal.ChangeSummary

Revisar diferenças sem executar.

- Estados: clean, dirty.
- Foco: Navegar não salva nem aplica.
- Teclado: Execução é ação separada.
- Linear: Antes/depois com segredos ocultos.
- Resize: Quebrar diferenças e manter escopo.

```ts
import { ChangeSummary } from '@inteiro/terminal';
ChangeSummary(session.changes, scope)
```

## terminal.StatusMessage

Informar fato, causa e recuperação.

- Estados: success, warning, danger, info.
- Foco: Erro permanece disponível.
- Teclado: Mensagem não captura foco.
- Linear: Texto inclui status sem cor.
- Resize: Quebra em linhas; sem toast efêmero.

```ts
import { StatusMessage } from '@inteiro/terminal';
StatusMessage(kind, message, next)
```

## terminal.Progress

Mostrar progresso real e cancelabilidade.

- Estados: idle, running, cancelling, succeeded, failed, cancelled, outcomeUnknown.
- Foco: Cancelamento e ajuda continuam disponíveis.
- Teclado: Esc solicita cancelamento sem prometer rollback.
- Linear: Atualizações append-only; percentual só com total.
- Resize: Etapa e estado preservados.

```ts
import { Progress } from '@inteiro/terminal';
Progress(label, state, completed, total, cancellable)
```

## terminal.TaskList

Apresentar etapas e resultados.

- Estados: running, succeeded, failed, cancelled.
- Foco: Não roubar foco a cada atualização.
- Teclado: Leitura e cancelamento via ação própria.
- Linear: Uma etapa por linha.
- Resize: Lista rola; resultado final permanece.

```ts
import { TaskList } from '@inteiro/terminal';
TaskList(tasks)
```

## terminal.ResultList

Explorar lista e detalhe preservando seleção.

- Estados: default, filtered, empty.
- Foco: IDs estáveis; busca preservada.
- Teclado: Setas navegam; Enter abre detalhe.
- Linear: Registros sequenciais.
- Resize: Detalhe lateral em 120; empilhado abaixo.

```ts
import { ResultList } from '@inteiro/terminal';
ResultList(items, focusedId, detail, columns)
```

## terminal.DetailView

Expor valor integral e atributos.

- Estados: default, unavailable.
- Foco: Retorno ao item de origem.
- Teclado: Esc volta sem mudar seleção.
- Linear: Rótulo e valor completos.
- Resize: Quebrar conteúdo sem truncamento definitivo.

```ts
import { DetailView } from '@inteiro/terminal';
DetailView(label, fields)
```

## terminal.DataTable

Comparar registros com ordem anunciada.

- Estados: default, sorted, empty.
- Foco: Ordenação é ação explícita.
- Teclado: Consumidor oferece ação de ordenar e detalhe.
- Linear: Todos os campos por registro.
- Resize: Prioridade de colunas; compacta vira registros.

```ts
import { DataTable } from '@inteiro/terminal';
DataTable(table, columns, linear)
```

## terminal.LogView

Acompanhar logs com memória limitada.

- Estados: following, paused, empty.
- Foco: Pausa congela visualização.
- Teclado: Ações Pausar, Retomar, Exportar explícitas.
- Linear: Texto exportável sem decoração.
- Resize: Histórico limitado e perdas anunciadas.

```ts
import { LogView } from '@inteiro/terminal';
LogView(log)
```

## terminal.EmptyState

Distinguir vazio, filtro e indisponibilidade.

- Estados: empty, filtered, unavailable.
- Foco: Próxima ação disponível.
- Teclado: Não bloquear ajuda e diagnóstico.
- Linear: Motivo e próximo passo.
- Resize: Texto quebra integralmente.

```ts
import { EmptyState } from '@inteiro/terminal';
EmptyState(kind, next)
```

## terminal.ErrorState

Preservar contexto e oferecer recuperação.

- Estados: error.
- Foco: Erro junto ao campo quando aplicável.
- Teclado: Repetir só após resultado conhecido.
- Linear: Mensagem e recuperação persistentes.
- Resize: Texto completo; nunca só cor.

```ts
import { ErrorState } from '@inteiro/terminal';
ErrorState(message, next)
```

## terminal.HelpView

Expor ações efetivas, modo e saída.

- Estados: default.
- Foco: Retorna ao foco anterior.
- Teclado: Bindings do registro; Esc fecha ajuda.
- Linear: Ajuda em linhas sem redesenho.
- Resize: Rolagem para textos longos.

```ts
import { HelpView } from '@inteiro/terminal';
HelpView(mode, bindings)
```
