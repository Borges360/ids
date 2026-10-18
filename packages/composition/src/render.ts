import { getPattern } from "./index.ts";
export function renderPattern(id: string, state = "default"): string {
  const p = getPattern(id);
  if (!p) throw new Error("Pattern not found: " + id);
  if (!p.states.includes(state)) throw new Error("Unsupported state " + state);
  let content = p.markup;
  if (state === "loading")
    content =
      '<div aria-busy="true"><p role="status">Carregando registros…</p></div>';
  if (state === "empty")
    content =
      '<section aria-label="Sem resultados"><h2>Nenhum registro</h2><p>Crie um registro para começar.</p><button type="button">Criar registro</button></section>';
  if (state === "error")
    content =
      '<div role="alert"><h2>Não foi possível carregar</h2><p>Tente novamente.</p><button type="button">Tentar novamente</button></div>';
  if (state === "disabled")
    content = content.replace(
      /<(input|select|textarea|button)\b/g,
      "<$1 disabled",
    );
  if (state === "readonly")
    content = content
      .replace(/<(input|textarea)\b/g, "<$1 readonly")
      .replace(/<(select|button)\b/g, "<$1 disabled");
  if (state === "invalid")
    content =
      content.replace(
        /<(input|select|textarea)\b/g,
        '<$1 aria-invalid="true" aria-describedby="pattern-error"',
      ) + '<p id="pattern-error" role="alert">Revise o campo indicado.</p>';
  if (state === "open")
    content = content
      .replace("<dialog ", "<dialog data-in-auto-modal ")
      .replace(" popover>", ' popover="manual" data-in-auto-open>')
      .replace("<details>", "<details open>");
  return (
    '<div class="in-composition" data-in-pattern="' +
    p.id +
    '" data-in-state="' +
    state +
    '">' +
    content +
    "</div>"
  );
}
