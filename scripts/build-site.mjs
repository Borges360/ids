import { cp, mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
await mkdir("dist/site", { recursive: true });
for (const directory of [
  "apps/demo",
  "apps/catalog",
  "packages/composition",
  "docs/assets",
  "docs/terminal",
  "packages/tokens/dist/css",
  "packages/tokens/dist/json",
  "packages/tokens/dist/figma",
  "packages/design-system/src",
])
  await cp(directory, `dist/site/${directory}`, { recursive: true });
await cp("apps/demo/index.html", "dist/site/index.html");
// Documentação versionada: /v/<versão>/ e /versions.json.
await mkdir("dist/site/v", { recursive: true });
await cp("docs-archive/versions.json", "dist/site/versions.json");
for (const entry of await readdir("docs-archive", { withFileTypes: true }))
  if (entry.isDirectory())
    await cp(`docs-archive/${entry.name}`, `dist/site/v/${entry.name}`, { recursive: true });
await cp("storybook-static", "dist/site/storybook", { recursive: true });
const version = JSON.parse(await readFile("package.json", "utf8")).version;
await writeFile(
  "dist/site/release.json",
  JSON.stringify(
    {
      version,
      commit: process.env.GIT_COMMIT ?? process.env.GITHUB_SHA ?? null,
      catalogSha256: createHash("sha256")
        .update(await readFile("packages/tokens/source/catalog.json"))
        .digest("hex"),
    },
    null,
    2,
  ),
);
console.log(`Site ${version} pronto em dist/site`);
