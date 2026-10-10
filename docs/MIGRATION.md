# Migração

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
