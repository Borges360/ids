# Integrações

Portabilidade ≠ os mesmos componentes em todas as plataformas. Tokens universais vs adaptadores.

| Stack | Como |
|---|---|
| CSS | `@import "@inteiro/tokens/css"` + classes `.in-*` |
| HTML | `examples/html` |
| JS/TS | `import { tokens } from "@inteiro/tokens/js"` (valores resolvidos) |
| React | `@inteiro/react` componentes, templates e InteiroProvider (sem Emotion) |
| Next.js | import CSS no layout; `data-in-theme` no `<html>` |
| Tailwind | `inteiroTailwindTheme` |
| Vue | classes CSS + plugin `InteiroVue` |
| Svelte | classes CSS |
| Flutter | `packages/tokens/dist/flutter/inteiro.dart` — cores/espaço, não widgets |
| SwiftUI | `packages/tokens/dist/swift/Inteiro.swift` |

Android recebe cores XML do gerador do catálogo (`npm run build:platforms`), com alfa preservado; não há widgets Compose. Flutter/Swift também exportam tokens, sem widgets. Recursive precisa ser carregada pelo app (Google Fonts ou self-host OFL). Os arquivos Figma e o plugin local estão descritos em `EXPANSION.md`.
