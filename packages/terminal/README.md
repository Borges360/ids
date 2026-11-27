# @inteiro/terminal 2.0.0-rc.1

Contrato INTEIRO Terminal 1.0.0: componentes como projeções em células, estado, ações e modelos independentes de renderer. Entradas optativas `/pi`, `/prompts` e `/linear` isolam host e IO.

Consulte `docs/terminal/README.md` (normativo, inclui a seção "Adaptador Pi 1.4"), `docs/terminal/components.md` e os pilotos `examples/terminal/`. O estado de qualificação é publicado em `docs/terminal/qualification.json`; implementação não equivale a ensaio com leitor de tela. Mudanças por versão: `CHANGELOG.md`.

Núcleo: Node 22.14+, sem dependências de runtime. Pi opcional: pi-tui 1.5.2 a 1.6.x / Node 22.19+. Inquirer opcional: prompts 7.10.1. Nenhuma dependência opcional é importada pela raiz. Não se presume publicação no registro npm.

## 1.4 em resumo

- Mensagens em `en` e `pt-BR` (`locale`, `messages` parciais); o padrão do pacote continua `pt-BR`.
- `presentation: "standard"`, Esc duplo para descartar, linhas de ação com operação cancelável, `formatError`, salvamento cancelável e reconciliação, escolhas carregadas sob demanda, prévia do rascunho (`onDraftChange`, `setLocale`, `relabel`).
- Largura medida pela função injetada (`setCellWidthMeasure`); o adaptador Pi usa `visibleWidth` do host e nenhuma linha passa da largura pedida.
- `openPiSettings` liga o perfil Pi por padrão (inglês, `standard`, Esc duplo, save cancelável) e devolve `action` quando uma linha de ação fecha o painel. `openPiWorkspace` também abre em inglês sem `locale`.

## Cópia em outro projeto (vendoring)

Extensões que não dependem de um checkout do IDS recebem uma cópia versionada do fecho de `pi.ts` (sem `prompts`/`linear`):

```sh
npm run vendor:terminal -- --out ../minha-extensao/src/vendor/terminal --format ts   # tsc com rewriteRelativeImportExtensions
npm run vendor:terminal -- --out ../minha-extensao/vendor/terminal --format js       # ESM .js sem build (Node 20+)
npm run vendor:terminal -- --check ../minha-extensao/vendor/terminal                 # integridade + procedência
```

O diretório recebe `VENDOR.json` (versão, contrato, commit, data, formato, sha256 de cada arquivo de origem e emitido, `patches: []`), `LICENSE` e `verify-vendor.mjs`, um verificador sem dependências para os testes do consumidor (`node vendor/terminal/verify-vendor.mjs`).
