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
      '<section aria-label="Sem resultados"><h2>Nenhum registro</h2><p>Crie um registro para começar.</p><button class="in-button in-button--primary" type="button">Criar registro</button></section>';
  if (state === "error")
    content =
      '<div role="alert"><h2>Não foi possível carregar</h2><p>Tente novamente.</p><button class="in-button in-button--primary" type="button">Tentar novamente</button></div>';
  if (state === "disabled")
    content = content.replace(
      /<(input|select|textarea|button)\b/g,
      "<$1 disabled",
    );
  if (state === "readonly")
    content = content.replace(
      /<(input|textarea|select|button)\b([^>]*)>/g,
      (_markup, tag: string, attributes: string) => {
        const type = attributes.match(/\btype="([^"]*)"/)?.[1] ?? "text";
        const supportsReadonly =
          tag === "textarea" ||
          (tag === "input" &&
            ![
              "checkbox",
              "radio",
              "file",
              "range",
              "color",
              "button",
              "submit",
              "reset",
              "image",
              "hidden",
            ].includes(type));
        const clean = attributes.replace(
          /\s(?:readonly|disabled)(?:="[^"]*")?/g,
          "",
        );
        return `<${tag}${clean} ${supportsReadonly ? "readonly" : "disabled"}>`;
      },
    );
  if (state === "invalid")
    content =
      content.replace(
        /<(input|select|textarea)\b([^>]*)>/g,
        (_markup, tag: string, attributes: string) => {
          const descriptions = [
            ...attributes.matchAll(/\saria-describedby="([^"]*)"/g),
          ]
            .flatMap((match) => match[1]!.split(/\s+/))
            .filter(Boolean);
          const clean = attributes.replace(
            /\saria-(?:invalid|describedby)="[^"]*"/g,
            "",
          );
          return `<${tag}${clean} aria-invalid="true" aria-describedby="${[...new Set([...descriptions, "pattern-error"])].join(" ")}">`;
        },
      ) +
      '<p class="in-field-error" id="pattern-error" role="alert">Revise o campo indicado.</p>';
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
