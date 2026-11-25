# Governança

A fonte editável é `packages/tokens/source/catalog.json`. Os demais arquivos em `source/*.tokens.json` e `dist/` são gerados. Nunca edite as saídas manualmente. Categorias têm paths hierárquicos; CSS usa o prefixo público `--in-`. Componentes consomem tokens semânticos de cor.

## Ciclo de mudança

1. Abrir uma branch `codex/*` ou feature a partir de develop e descrever a necessidade recorrente.
2. Alterar fonte JSON, biblioteca, contratos MCP e exemplos juntos. Nova extensão recebe `status: extension` e origem em `sourceSection`.
3. Executar `npm run ci` e `npm run test:browser`. Conferir as capturas, teclado, RTL e os temas. A primeira baseline visual precisa de revisão; não aceitar diffs automaticamente.
4. Abrir PR com comportamento antes/depois, impacto, migração e evidências. Revisão de design e desenvolvimento antecede merge.
5. Promover a release pelo Jenkins e confirmar commit, imagem, rollout e health. Guardar URL do build e resultado. Em falha, restaurar a imagem anterior pelo procedimento do ambiente.

## Semver

Adicionar token, componente ou variante compatível: minor. Corrigir implementação preservando o contrato: patch. Remover/renomear token, mudar tipo ou significado semântico, remover prop ou alterar interação incompatível: major, com período de depreciação e guia de migração. `color.accent` continua compatível e depreciado; não foi removido.

`check:tokens` compara o catálogo com `TOKEN_BASE_REF` (HEAD por padrão para alterações locais), rejeitando remoção, mudança de tipo ou CSS var. O primeiro commit da migração JSON usa o snapshot de contrato em `tests/fixtures`. A CI de PR busca o histórico e define o SHA base; Jenkins usa o commit anterior bem-sucedido quando disponível. A avaliação de significado continua na revisão humana.

Chromatic usa um segredo do CI e não publica pacotes npm. Figma é importação explícita: o build não modifica arquivos de design remotos. Publicação npm/marketplace continua fora do deploy do site.

## Adoção e acompanhamento

A cada release, registrar consumidores migrados, tokens depreciados em uso (`inteiro audit`), violações de acessibilidade e orçamento gzip. Novas rotas devem entrar na matriz de revisão visual do MCP. As fases do relatório foram organizadas em fundações, interoperabilidade, biblioteca, templates e validação; os comandos e a matriz de `EXPANSION.md` substituem as datas hipotéticas do Gantt por evidências reproduzíveis.
