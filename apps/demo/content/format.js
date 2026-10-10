/** Helpers de markup da documentação. O HTML resultante é conteúdo confiável do próprio site. */

export function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function code(lang, source) {
  return `<figure class="code"><figcaption><span class="in-voice-machine">${esc(lang)}</span><button type="button" class="copy" data-copy>Copiar</button></figcaption><pre tabindex="0"><code>${esc(source.trim())}</code></pre></figure>`;
}

export function reflection(html) {
  return `<aside class="callout callout--reflection"><div class="callout__body in-voice-human">${html}</div></aside>`;
}

export function commitNote(html) {
  return `<aside class="callout callout--commit"><p class="kicker">Decisão</p>${html}</aside>`;
}

export function doDont(good, bad) {
  return `<div class="pair"><article class="in-card" data-kind="reflection"><p class="pair__label">Fazer</p>${good}</article><article class="in-card"><p class="pair__label pair__label--danger">Evitar</p>${bad}</article></div>`;
}

export function page(def) {
  return def;
}
