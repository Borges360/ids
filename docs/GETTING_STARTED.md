# Começando

## 1. Instalar o monorepo

```bash
cd IDS
npm install
npm run build
```

Node ≥ 22.14. Este ambiente usa Node 24.

## 2. Consumir em um projeto

```bash
npm install ../IDS/packages/tokens
# ou tarball
npm install ../IDS/artifacts/inteiro-tokens-1.0.0.tgz
```

```ts
import { tokens } from "@inteiro/tokens";
```

```css
@import "@inteiro/tokens/css";
```

## 3. CLI

```bash
npx inteiro init --yes
npx inteiro doctor
npx inteiro tokens search commit
npx inteiro tokens explain color.identity.commit
npx inteiro agents install cursor --yes
```

`init` detecta React/Next/Vue/Svelte/HTML, grava `inteiro.css` e anexa um bloco INTEIRO em `AGENTS.md` sem apagar conteúdo existente.

## 4. Primeira interface

1. `data-in-theme="dark"` e `data-in-density="focus"` (ou `calm` se for editorial).
2. Um botão primary (violeta) por contexto.
3. Commit (laranja) só para publicar/deploy/aplicar.
4. Costura (`border-inline-start`) só se a informação muda interpretação.
5. Texto via `color.text.*`, nunca opacity em texto ativo.

## 5. Agentes

```bash
npx inteiro agents install all --yes
```

Isso copia skills canônicas e manifests. Skills por token são geradas com `npx inteiro skills generate` e consultadas sob demanda — não carregue milhares no contexto.
