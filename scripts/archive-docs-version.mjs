// Congela a documentação de uma versão publicada em docs-archive/<versão>/.
// Uso: node scripts/archive-docs-version.mjs <ref-git> <versão> [--status=arquivada]
// A cópia é imutável: gerada de um ref (release/x.y.z), com os CSS de tokens
// reconstruídos a partir do catálogo daquele ref e os caminhos absolutos
// reescritos para /v/<versão>/. Fontes (packages/composition) e Storybook
// continuam sendo os da versão atual.
import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [ref, version] = process.argv.slice(2);
if (!ref || !version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("uso: node scripts/archive-docs-version.mjs <ref-git> <x.y.z>");
  process.exit(2);
}

const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"], maxBuffer: 1 << 30, ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(" ")}\n${r.stderr}`);
  return r.stdout;
};

const tmp = await mkdtemp(join(tmpdir(), `ids-${version}-`));
const out = join("docs-archive", version);
try {
  const tarFile = join(tmp, "src.tar");
  await writeFile(tarFile, run("git", ["archive", "--format=tar", ref]));
  const src = join(tmp, "src");
  await mkdir(src);
  // Caminhos relativos: o tar do Git Bash lê "C:" como nome de máquina.
  run("tar", ["-xf", "src.tar", "-C", "src"], { cwd: tmp });
  run("node", ["--experimental-strip-types", "packages/tokens/src/build.ts"], { cwd: src });

  const pkg = JSON.parse(await readFile(join(src, "package.json"), "utf8"));
  if (pkg.version !== version) throw new Error(`ref ${ref} tem versão ${pkg.version}, esperado ${version}`);
  const commit = run("git", ["rev-parse", ref]).toString().trim();

  await rm(out, { recursive: true, force: true });
  const copies = [
    ["apps/demo", "apps/demo"],
    ["docs", "docs"],
    ["packages/tokens/dist/css", "packages/tokens/dist/css"],
    ["packages/design-system/src/components.css", "packages/design-system/src/components.css"],
  ];
  for (const [from, to] of copies) {
    if (!existsSync(join(src, from))) continue;
    await mkdir(join(out, to, ".."), { recursive: true });
    await cp(join(src, from), join(out, to), { recursive: true });
  }

  // Caminhos absolutos da própria versão passam a viver sob /v/<versão>/.
  const rewrite = new RegExp("([\"'`(=])/(apps|docs|packages/tokens|packages/design-system)/", "g");
  const textual = /\.(html|js|css|md)$/;
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) await walk(p);
      else if (textual.test(entry.name)) {
        const text = await readFile(p, "utf8");
        const next = text.replace(rewrite, `$1/v/${version}/$2/`);
        if (next !== text) await writeFile(p, next);
      }
    }
  };
  await walk(out);

  // Faixa de aviso: a página arquivada nunca se passa pela atual.
  const indexPath = join(out, "apps/demo/index.html");
  const html = await readFile(indexPath, "utf8");
  const banner =
    `<div class="archive-banner" role="note" style="position:sticky;top:0;z-index:50;padding:8px 16px;` +
    `font:14px/1.4 system-ui,sans-serif;background:#2A2540;color:#F1EEF8;border-bottom:1px solid #4A4366">` +
    `Documentação arquivada da versão <strong>${version}</strong>. ` +
    `<a style="color:#C9B8FF" href="/#/resources/guide/versoes">Ver versões</a> · ` +
    `<a style="color:#C9B8FF" href="/">Ir para a versão atual</a></div>`;
  await writeFile(indexPath, html.replace(/(<body[^>]*>)/, `$1${banner}`));
  await cp(indexPath, join(out, "index.html"));

  await writeFile(
    join(out, "ARCHIVE.json"),
    JSON.stringify({ version, ref, commit, note: "Cópia congelada; não editar." }, null, 2) + "\n",
  );
  console.log(`docs-archive/${version} gerado de ${ref} (${commit.slice(0, 7)})`);
} finally {
  await rm(tmp, { recursive: true, force: true });
}
