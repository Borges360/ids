# Documentação visual

A página em `apps/demo` é a documentação do INTEIRO. Conteúdo em `apps/demo/content`, casca em `index.html`, apresentação em `docs.css`, comportamento em `app.js`.

## Executar

```bash
npm install
npm run build
npm run demo
```

Abra `http://127.0.0.1:4173/apps/demo/index.html`. A raiz `/` também serve essa página. Node ≥ 22.14.

## O que a página implementa

- Menu lateral hierárquico, grupos expansíveis, seção ativa com Costura.
- Trilha, busca (Ctrl/Cmd+K), índice da seção com scrollspy, anterior/próximo.
- Tema (`dark`, `light`, `contrast-dark`, `contrast-light`) e densidade (`focus`, `calm`) reais.
- Playgrounds de Button, Input, Card e Badge, com código copiável.
- Medidor de contraste do tema ativo, filtro, formulário que valida, diálogo de exclusão e de publicação.
- Menu móvel. Sem JavaScript, os Markdown em `/docs` continuam servidos.

## O que não é o sistema

Não há componentes React de interface. Dialog, tabela, navegação, empty state e loading são recipes ou exemplos locais. IconButton, Select, Tabs, Toast e os demais citados no brief de documentação não existem no catálogo.

A paleta Interior / `#8B5CF6` / `#FF9138` e as famílias Space Grotesk, IBM Plex Mono e Instrument Serif não foram adotadas. A fonte de verdade continua `deep-research-report.md` e `packages/tokens/src/catalog`. O conflito está na página Recursos.

## Testes desta entrega

Em 2026-10-10, nesta máquina:

- `npx vitest run tests/docs-site.test.ts tests/contrast` — 5 testes passaram (catálogo de páginas e links internos; pares de contraste já existentes).
- `npx tsc --noEmit -p tsconfig.json` — passou.
- Navegação, busca por “costura”, playground do botão (primary → commit “Publicar”) e o menu em viewport de 390px foram exercitados no navegador.

Não houve auditoria axe, Playwright, regressão visual nem revisão manual de zoom 400% em todos os temas. Isso não é declaração de conformidade WCAG da página. O gate de contraste do catálogo continua sendo `npm run test:contrast`.
