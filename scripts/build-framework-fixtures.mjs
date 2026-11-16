import { mkdir, writeFile, readFile, cp } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { build } from "esbuild";
import { parse, compileScript } from "@vue/compiler-sfc";
import { compile } from "svelte/compiler";
const out = "apps/fixtures";
await mkdir(out, { recursive: true });
const header =
  '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/packages/composition/src/composition.css">';
for (const framework of ["html", "react", "vue", "svelte"]) {
  const body =
    framework === "html"
      ? '<main><h1>HTML fixture</h1><label for="name">Nome</label><input id="name"><button type="button">Salvar rascunho</button></main>'
      : '<div id="app"></div><script type="module" src="./' +
        framework +
        '.js"></script>';
  await writeFile(
    out + "/" + framework + ".html",
    '<!doctype html><html lang="pt-BR" data-in-theme="light" data-in-density="calm">' +
      header +
      "<title>" +
      framework +
      ' fixture</title><body class="in-composition">' +
      body +
      "</body></html>",
  );
}
await build({
  stdin: {
    contents: `import {createElement as h} from 'react';import {createRoot} from 'react-dom/client';import {AppShell,TextField,Button} from './packages/react/src/index.ts';createRoot(document.getElementById('app')).render(h(AppShell,{title:'React fixture',navigation:[]},h('h1',null,'React fixture'),h(TextField,{label:'Nome'}),h(Button,null,'Salvar rascunho')));`,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  outfile: out + "/react.js",
});
const vue = await readFile("examples/vue/App.vue", "utf8");
const descriptor = parse(vue, { filename: "App.vue" }).descriptor;
const vueCode = compileScript(descriptor, {
  id: "fixture-vue",
  inlineTemplate: true,
}).content;
const vueModule = vueCode.replace("export default", "const Fixture =");
await build({
  stdin: {
    contents:
      vueModule +
      `\nimport {createApp} from 'vue';createApp(Fixture).mount('#app');`,
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  outfile: out + "/vue.js",
});
const svelte = compile(await readFile("examples/svelte/App.svelte", "utf8"), {
  filename: "App.svelte",
  generate: "client",
  css: "injected",
}).js.code;
await build({
  stdin: {
    contents:
      svelte.replace("export default function App", "function App") +
      `\nimport {mount} from 'svelte';mount(App,{target:document.getElementById('app')});`,
    resolveDir: process.cwd(),
    loader: "js",
  },
  bundle: true,
  format: "esm",
  outfile: out + "/svelte.js",
});
console.log("HTML, React, Vue and Svelte fixtures built");
if (process.argv.includes("--next")) {
  execFileSync(
    process.execPath,
    ["node_modules/next/dist/bin/next", "build", "examples/nextjs"],
    { stdio: "inherit",env:{...process.env,NEXT_TELEMETRY_DISABLED:'1'} },
  );
  await cp("examples/nextjs/out", out + "/next", { recursive: true });
  console.log("Next static export fixture built");
}
