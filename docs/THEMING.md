# Temas

```html
<html data-in-theme="dark" data-in-density="focus">
```

Temas da fonte: **dark** (padrão) e **light**.

Extensão proposta: **contrast-dark** e **contrast-light** — o documento cita High Contrast sem tabela completa; os valores aumentam contraste de texto e borda sem usar preto/branco como única personalidade.

Overrides em runtime devem atuar na semântica, não em `violet.400`:

```css
.my-context { --in-color-identity-primary: #b59bff; }
```

`prefers-color-scheme: light` informa o canvas quando `data-in-theme` está ausente no `:root`, mas o documento trata dark como atmosfera primária.
