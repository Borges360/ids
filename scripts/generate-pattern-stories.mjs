import { readFile, writeFile, mkdir } from "node:fs/promises";
import { renderPattern } from "../packages/composition/src/render.ts";
const patterns = JSON.parse(
  await readFile("packages/composition/catalog.index.json", "utf8"),
);
const imports = `import {createElement as h,useEffect,useRef} from 'react';
import {enhance} from '../packages/composition/src/behavior.js';
import '../packages/composition/src/composition.css';
function Pattern({html}) {const ref=useRef(null);useEffect(()=>enhance(ref.current),[html]);return h('div',{ref,dangerouslySetInnerHTML:{__html:html}});}
export default {title:'P0/Patterns',parameters:{layout:'fullscreen'}};
`;
const stories = [],
  matrix = [];
for (const p of patterns)
  for (const state of p.states) {
    const name =
      p.id
        .split("-")
        .map((s) => s[0].toUpperCase() + s.slice(1))
        .join("") +
      state[0].toUpperCase() +
      state.slice(1);
    const html = renderPattern(p.id, state);
    const meta = {
      patternId: p.id,
      variant: "default",
      state,
      theme: "globals.theme",
      density: "globals.density",
      viewportClass: "responsive",
      interactionSpec: p.accessibility.keyboardSpec,
      accessibilityExpectation: "WCAG 2.2 AA automated subset",
      fixtureId: "synthetic-patterns",
    };
    stories.push(
      `export const ${name}={render:()=>h(Pattern,{html:${JSON.stringify(html)}}),parameters:{inteiro:${JSON.stringify(meta)}}};`,
    );
    matrix.push({
      ...meta,
      storyId:
        "p0-patterns--" +
        name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(),
    });
    const body =
      p.id === "app-shell"
        ? html
        : "<main>" +
          (html.includes("<h1>") ? "" : "<h1>" + p.description + "</h1>") +
          html +
          "</main>";
    await writeFile(
      `packages/composition/examples/${p.id}-${state}.html`,
      `<!doctype html><html lang="pt-BR" data-in-theme="light" data-in-density="calm"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${p.description} — ${state}</title><link rel="stylesheet" href="../dist/composition.css"><body class="in-composition">${body}<script type="module">import {enhance} from '../src/behavior.js'; enhance();</script></body></html>`,
    );
  }
await writeFile(
  "stories/Patterns.stories.ts",
  imports + stories.join("\n") + "\n",
);
await writeFile(
  "packages/composition/story-matrix.json",
  JSON.stringify(matrix, null, 2) + "\n",
);
await mkdir("apps/catalog", { recursive: true });
await writeFile(
  "apps/catalog/index.html",
  `<!doctype html><html lang="pt-BR" data-in-theme="light" data-in-density="calm"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>INTEIRO — Padrões P0</title><link rel="stylesheet" href="/packages/composition/src/composition.css"><body><main class="in-container"><h1>Padrões P0</h1><p>Catálogo HTML/CSS agnóstico. Estados, teclado e tokens têm contratos locais verificáveis.</p><label for="pattern">Padrão</label><select id="pattern">${patterns.map((p) => `<option value="${p.id}">${p.id} — ${p.description}</option>`).join("")}</select><iframe title="Exemplo do padrão" id="example" width="100%" height="640" src="/packages/composition/examples/app-shell.html"></iframe></main><script>document.getElementById('pattern').addEventListener('change',e=>document.getElementById('example').src='/packages/composition/examples/'+e.target.value+'.html')</script></body></html>`,
);
console.log(`${stories.length} pattern/state stories generated`);
