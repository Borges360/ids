# Arquitetura

Fonte de verdade de identidade: `deep-research-report.md`.
Fonte de verdade de tokens: catálogo TypeScript em `packages/tokens/src/catalog`, emitido para JSON DTCG 2025.10.

```
decisões de identidade
        ↓
  primitives (matéria)
        ↓
  semantic (significado) ← temas dark/light/contrast
        ↓
  component (contrato) ← densidade calm/focus
        ↓
  CSS / TS / Flutter / skills / agentes
```

Dependência unidirecional. Componente não aponta para hex nem para primitivo de cor.

## Monorepo

Núcleo independente de framework e de harness. Adaptadores só traduzem o núcleo para o mecanismo real de cada ferramenta.

Geração determinística: o mesmo catálogo produz CSS, JSON, TS, SCSS, Dart, Swift, Tailwind, SKILL.md e docs de token.

## Runtime

Dependências mínimas. Tokens e CLI rodam em Node 22.14+ com type stripping. React/Emotion são peer opcionais. CSS funciona em qualquer stack.

## Offline

Após `npm install` local, tokens, CSS, skills e o MCP stdio funcionam sem rede (exceto a font Recursive via Google Fonts na demo).

## Versionamento

SemVer + contrato visual. Mudar a semântica de `primary` de violeta para laranja é MAJOR, mesmo que o TypeScript compile.
