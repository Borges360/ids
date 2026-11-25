# Revisão com leitor de tela — TERM-12

Esta etapa requer um leitor de tela real, identificado, e uma pessoa que confirme a experiência. Não usar teste de estado, transcript ou axe para preencher esta evidência como aprovada.

Ambiente recomendado inicial: Windows Terminal + PowerShell + Narrator ou NVDA. Registrar versões do terminal, shell e leitor, data, commit e modo de apresentação. Não gravar credenciais ou áudio com conteúdo pessoal.

## Ensaio reproduzível

No checkout IDS, com dependências instaladas:

```powershell
node examples/terminal/standalone.ts --config "$env:TEMP\inteiro-accessibility-review.json" --ui linear
```

1. Confirmar que título, escopo, valores e ações são lidos em ordem compreensível.
2. Digitar `3`, depois `5`: o limite muda somente no rascunho; o contexto continua disponível.
3. Digitar `s`: confirmar mensagem “Alterações salvas”, painel ainda aberto e limite 5.
4. Digitar `3`, depois `0`: confirmar erro “Informe um inteiro entre 1 e 8”, sem perder o valor salvo.
5. Digitar `3`, depois `6`; digitar `0`: a decisão de alterações deve ser lida.
6. Digitar `1`: voltar à edição sem descartar. Digitar `0`, depois `3`: descartar e encerrar.
7. Reabrir: o limite persistido continua 5. Encerrar pelo `0`.
8. Repetir em `--ui prompts`: setas, Enter, voltar por Esc, salvar por ação visível e interromper por Ctrl+C. Confirmar restauração do shell e acesso ao conteúdo sem depender de cor.
9. Em Pi 1.5.2, carregar explicitamente `examples/terminal/pi-extension.ts` e usar `/terminal-preferences`. Confirmar foco, edição, ajuda, salvamento e retorno ao editor do host.
10. Registrar qualquer trecho não anunciado, repetição excessiva, falta de orientação ou bloqueio. Resultado com defeito é `failed`; resultado não ensaiado é `pending`.

Resposta mínima para registrar a revisão: leitor/versão, terminal/versão, modos ensaiados, resultado de cada passo e defeitos observados. O relatório deve apontar o commit testado. A presença do guia não conta como execução.
