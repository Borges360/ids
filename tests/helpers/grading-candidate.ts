import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  realpath,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, basename, resolve } from "node:path";
import { execFileSync } from "node:child_process";
export async function gradingCandidate(
  id: string,
  mode: "starter" | "reference" | "mutation" = "starter",
  datasetRoot = process.cwd(),
) {
  if (!/^(?:task-(?:0[1-9]|[12][0-9]|30)|heldout-(?:[1-9]|10))$/.test(id))
    throw Error(
      "Only declared benchmark cases are supported by this self-test helper",
    );
  const root = await mkdtemp(join(tmpdir(), "inteiro-grade-case-"));
  await mkdir(join(root, "src"));
  for (const name of ["index.html", "app.js"])
    await writeFile(
      join(root, "src", name),
      await readFile(
        resolve(datasetRoot, `benchmarks/workers/${id}/src/${name}`),
      ),
    );
  await writeFile(
    join(root, "inteiro.config.json"),
    await readFile(
      resolve(datasetRoot, "benchmarks/contract/inteiro.config.json"),
    ),
  );
  if (mode !== "starter") {
    if (id.startsWith("heldout-") || Number(id.slice(-2)) > 10) {
      let implementation = await readFile(
        resolve(datasetRoot, `benchmarks/evaluator/references/${id}.js`),
        "utf8",
      );
      if (mode === "mutation")
        implementation +=
          "\n" +
          (await readFile(
            resolve(datasetRoot, `benchmarks/evaluator/mutations/${id}.js`),
            "utf8",
          ));
      await writeFile(join(root, "src/app.js"), implementation);
    } else {
      let implementation =
        "const benchmarkCase=" +
        JSON.stringify(id) +
        ";\n" +
        (await readFile(
          resolve(datasetRoot, "benchmarks/evaluator/reference.js"),
          "utf8",
        ));
      const mutations: Record<string, string> = {
        "task-01":
          'form.onsubmit=event=>{event.preventDefault(); status.textContent="Cadastro criado";};',
        "task-02":
          'const list=document.querySelector("ul");const reverse=()=>{const values=[...list.children]; if(values.length>1&&values[0].textContent<values[1].textContent)list.replaceChildren(...values.reverse());};new MutationObserver(reverse).observe(list,{childList:true});',
        "task-03":
          'const total=document.querySelector("[data-testid=kpi-total]");new MutationObserver(()=>{if(total.textContent!=="120")total.textContent="120";}).observe(total,{childList:true});',
        "task-04": 'document.querySelector("nav").onkeydown=null;',
        "task-05":
          'byText("Cancelar").onclick=async()=>{await get("/api/items/1","DELETE");document.querySelector("dialog").close();};',
        "task-06": 'document.querySelector("[role=alert]").hidden=true;',
        "task-07":
          'byText("Editar observação").onclick=()=>{document.querySelector("dialog").showModal();byText("Fechar").focus();};',
        "task-08":
          'byText("Abrir detalhes").onclick=()=>{document.querySelector("dialog").show();byText("Fechar detalhes").focus();};',
        "task-09": "localStorage.setItem=()=>{};",
        "task-10": 'document.querySelector("article").style.width="2000px";',
      };
      if (mode === "mutation") implementation += "\n" + mutations[id];
      await writeFile(join(root, "src/app.js"), implementation);
    }
  }
  const git = (...args: string[]) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  git("init");
  git("add", "src", "inteiro.config.json");
  git(
    "-c",
    "user.name=Synthetic",
    "-c",
    "user.email=synthetic@example.invalid",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "-m",
    "Synthetic benchmark grading self-test",
  );
  return {
    root,
    async cleanup() {
      const target = await realpath(root);
      if (
        dirname(target) !== (await realpath(tmpdir())) ||
        !basename(target).startsWith("inteiro-grade-case-")
      )
        throw Error("Unsafe cleanup");
      await rm(target, { recursive: true, force: true });
    },
  };
}
