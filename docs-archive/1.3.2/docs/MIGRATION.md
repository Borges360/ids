# Migração

## De 1.1 para 1.2

Atualize os pacotes `@inteiro/*` juntos para 1.2.0. Os 316 tokens anteriores e as recipes continuam disponíveis. A fonte editável passa de módulos TypeScript para `packages/tokens/source/catalog.json`; o build gera os demais arquivos. O catálogo de tokens tem versão 1.1.0 por adicionar 22 extensões compatíveis.

O React agora requer build e exporta ESM e declarações, além do provider. Instale também o tarball `@inteiro/react` se usar a biblioteca. Importe o CSS de tokens e componentes; nenhuma dependência Emotion é necessária. Os nomes `primary`, `commit`, `secondary` etc. foram preservados; `solid`, `outline` e `text` são aliases na API React.

Consulte `docs/LIBRARY.md`, `docs/EXPANSION.md` e o Storybook. Reinicie consumidores do servidor MCP após atualizar o pacote para descobrir `inteiro_get_component`.

## De uma identidade genérica

De um sistema genérico (Inter + roxo + accent laranja) para INTEIRO:

| Antes | Depois |
|---|---|
| `#8B5CF6` | `color.identity.primary` |
| `#FF9138` | `color.identity.commit` |
| Inter | Recursive `voice.rational` |
| JetBrains | `voice.machine` |
| Radius 8–12 ad-hoc | escala `radius.*` |
| Pill frequente | pill só badge/avatar |
| Shadow para elevar | superfície + borda |
| Compact/comfy | focus/calm |

```bash
npx inteiro migrate .
```

Não faça search-and-replace de hex. A migração é mudança de linguagem: violeta passa a significar escolha; laranja, atravessar.
