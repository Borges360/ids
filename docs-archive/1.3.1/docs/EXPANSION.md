# Expansão do Inteiro 1.2

O relatório de 18/10/2026 foi confrontado com o código: as paletas de sete famílias, tipografia Recursive, espaçamento, bordas, elevação, movimento, opacidade, quatro temas e duas densidades já existiam. Foram preservados os 316 tokens anteriores e adicionadas 22 extensões. Não adotamos Roboto, azul como primary ou prefixo `ds-`: esses eram exemplos do relatório, e substituiriam contratos da identidade existente.

| Recomendação | Entrega | Verificação |
|---|---|---|
| Fonte JSON única | `packages/tokens/source/catalog.json`, com metadados de origem, intenção, estados e acessibilidade | Validação, aliases, unicidade, testes de contrato |
| CSS, SCSS, JS/TS, mobile | Geradores do catálogo para Android, Swift e Flutter | `npm run build`, `npm run build:platforms` |
| Figma/Tokens Studio | `dist/figma/tokens-studio.json`, `figma.variables.json` e plugin local `packages/figma-plugin` | Contrato de exportação; importação no app depende de acesso ao Figma |
| Componentes | Biblioteca React tipada, estilos CSS compartilhados e arquivos ESM instaláveis | `docs/LIBRARY.md`, testes React e Storybook |
| Formulários | Campos, textarea, seleção simples/múltipla, pesquisa, checkbox, radio, switch, data/hora, edição inline e login | Rótulos, mensagens associadas, validação nativa e testes de interação |
| Navegação e overlays | Tabs, breadcrumbs, navegação, menu móvel, paginação, dialog, drawer, popover, tooltip | Teclado, foco, Escape, roving tabindex, RTL |
| Tabelas e gráficos | Busca, ordenação textual/numérica, paginação, estado vazio, gráficos de linha/barra/pizza | Testes de interação; alternativa tabular sempre visível |
| Templates | Página, shell, login, dashboard, mestre/detalhe, configurações, dados, vazio e erro | Stories e inspeção em mobile/desktop |
| Documentação interativa | Storybook com controles, autodocs, axe, temas, densidades e RTL | `npm run build:storybook` |
| Regressão visual | Capturas locais; integração Chromatic na CI | Serviço externo exige `CHROMATIC_PROJECT_TOKEN`; sem token a etapa é explicitamente registrada como não executada |
| Performance | ESM com React externo, CSS compartilhado e orçamento gzip | `npm run check:bundle` |
| Agentes/MCP | `inteiro_get_component`: imports, exemplos, estados e acessibilidade da implementação | Teste cruzado entre catálogo e exports React |
| Governança | Semver, guia de migração, revisão por PR, changelog, verificação de contrato | `CONTRIBUTING.md`, `docs/GOVERNANCE.md` |
| Jenkins | Jenkinsfile K3s completo, Dockerfile e parâmetros compatíveis com `ids-dev` | Atualização da configuração e deploy dependem de autenticação válida no MCP |

## Decisões de implementação

Seletores de data e hora usam inputs nativos. Isso oferece teclado, validação e localização pelo navegador. Não há calendário customizado com aparência uniforme entre plataformas. MultiSelect usa select múltiplo; a busca em registros é um componente próprio. Popover é uma região de conteúdo, não um menu ARIA. Toast e Banner compartilham Alert e ficam sob controle da aplicação: não expiram automaticamente nem movem foco.

Dialog e Drawer usam a top layer nativa, Escape, contenção explícita de Tab e restauração de foco. Textos de conteúdo são props; defaults em português podem ser substituídos nos controles. Templates são pontos de partida e não implementam autenticação, persistência ou autorização.

O teste axe em jsdom cobre semântica e associação de campos; contraste exige navegador. Os testes de navegador cobrem dashboard nos quatro temas em 320/1280px e diálogo. Isso não certifica conformidade WCAG de qualquer aplicação que use a biblioteca. Novas telas precisam de teclado, zoom e revisão com leitores de tela.

Texto normal exige AA 4,5:1; texto grande exige AA 3:1. AAA exige 7:1 e 4,5:1, respectivamente. A afirmação do relatório de que texto grande com 3:1 seria AAA foi corrigida aqui.

## Uso

```tsx
import '@inteiro/tokens/css';
import '@inteiro/design-system/css/components';
import { InteiroProvider, TextField, Button } from '@inteiro/react';

<InteiroProvider appearance="auto" density="focus">
  <TextField label="E-mail" type="email" required />
  <Button variant="outline">Revisar</Button>
</InteiroProvider>
```

Para designers, execute o build e importe o JSON no Tokens Studio, ou crie um plugin de desenvolvimento no Figma, obtenha o ID atribuído à sua conta, execute `node scripts/prepare-figma-plugin.mjs ID` e importe `artifacts/figma-plugin/manifest.json`. Então selecione `packages/tokens/dist/figma/figma.variables.json`. O plugin atualiza a coleção INTEIRO sem rede. A conta Figma precisa permitir os quatro modos. Tipografia composta e sombras continuam no arquivo Tokens Studio; Figma Variables recebe somente tipos que sua API representa. Unidades rem são convertidas com base de 16px; medidas ch não são importadas como pixels e permanecem no código/Tokens Studio.

## Referências

- [DTCG 2025.10](https://www.designtokens.org/tr/2025.10/format/): formato de intercâmbio do Community Group; não é uma recomendação W3C.
- [Storybook React/Vite](https://storybook.js.org/docs/get-started/frameworks/react-vite).
- [API remota do Jenkins](https://www.jenkins.io/doc/book/using/remote-access-api/).
- [WCAG 2.2: contraste mínimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
