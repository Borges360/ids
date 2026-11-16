# @inteiro/tokens

Catálogo DTCG 2025.10 do INTEIRO.

```ts
import { tokens } from "@inteiro/tokens/js";
// tokens.dark["color.text.primary"]
```

```css
@import "@inteiro/tokens/css";
```

Componentes não devem usar primitivos de cor.

Fonte editável: `source/catalog.json`. `npm run build` gera CSS, mapa SCSS, JS para navegador, TS, DTCG, Tokens Studio, Figma Variables, Swift e Flutter. `npm run build:platforms` na raiz gera `dist/android/colors.xml` (`#AARRGGBB`, tema escuro, alfa preservado). Tipos específicos do IDS e medidas de texto são extensões ao formato de intercâmbio DTCG.
