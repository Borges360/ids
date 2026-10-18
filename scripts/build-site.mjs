import { cp, mkdir, writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
await mkdir("dist/site", { recursive: true });
for (const directory of [
  "apps/demo",
  "docs/assets",
  "packages/tokens/dist/css",
  "packages/tokens/dist/json",
  "packages/tokens/dist/figma",
  "packages/design-system/src",
])
  await cp(directory, `dist/site/${directory}`, { recursive: true });
await cp("apps/demo/index.html", "dist/site/index.html");
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
