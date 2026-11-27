# Acessibilidade

Baseline: WCAG 2.2 AA. Extras INTEIRO: target primário 44×44, focus 2px offset 2px.

Gates de release (fonte):

- Texto normal ≥ 4.5:1; grande ≥ 3:1; componente ≥ 3:1
- Foco visível, distinto de selected
- Teclado completo
- Não só cor
- `prefers-reduced-motion`
- Reflow 320px; zoom 200%/400%; text-spacing
- Disabled ≠ readonly; erro com mensagem
- LTR + RTL (propriedades lógicas)
- Name/role/state

Pares de contrato (medidos no teste `tests/contrast`):

Ver `packages/tokens/dist/json/contrast.json` após o build.

Combinações de status sobre canvas podem ficar abaixo de 4.5:1 — por isso status nunca é só cor: ícone + texto. O mínimo gráfico é 3:1.

```bash
npx inteiro tokens validate
npm run test:contrast
```
