# Integrações

Portabilidade ≠ os mesmos componentes em todas as plataformas. Tokens universais vs adaptadores.

| Stack | Como |
|---|---|
| CSS | `@import "@inteiro/tokens/css"` + classes `.in-*` |
| HTML | `examples/html` |
| JS/TS | `import { tokens } from "@inteiro/tokens"` |
| React | `@inteiro/react` InteiroProvider (Emotion peer opcional) |
| Next.js | import CSS no layout; `data-in-theme` no `<html>` |
| Tailwind | `inteiroTailwindTheme` |
| Vue | classes CSS + plugin `InteiroVue` |
| Svelte | classes CSS |
| Flutter | `packages/tokens/dist/flutter/inteiro.dart` — cores/espaço, não widgets |
| SwiftUI | `packages/tokens/dist/swift/Inteiro.swift` |

Limitações: não há pacote Compose/Android nesta entrega; Flutter/Swift cobrem a plataforma não-web. Recursive precisa ser carregada pelo app (Google Fonts ou self-host OFL).
