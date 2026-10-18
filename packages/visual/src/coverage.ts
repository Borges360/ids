import { readdir } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { safePath, finding, type Config } from "@inteiro/contracts";
import type { Route } from "./index.ts";
export async function discoverRoutes(root: string, config: Config) {
  const found: { path: string; file: string }[] = [];
  for (const configured of config.browser.routeRoots) {
    const base = safePath(root, configured);
    const walk = async (dir: string) => {
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") return;
        throw e;
      }
      for (const entry of entries) {
        if (
          entry.isSymbolicLink() ||
          ["node_modules", ".next", "dist", ".git"].includes(entry.name)
        )
          continue;
        const file = resolve(dir, entry.name);
        if (entry.isDirectory()) {
          await walk(file);
          continue;
        }
        const path = relative(base, file).replaceAll("\\", "/");
        let route: string | undefined;
        if (config.project.framework === "html" && path.endsWith(".html"))
          route = "/" + relative(root, file).replaceAll("\\", "/");
        else if (
          config.project.framework === "next" &&
          /(?:^|\/)page\.[jt]sx?$/.test(path)
        )
          route =
            "/" +
            path
              .replace(/(?:^|\/)page\.[jt]sx?$/, "")
              .split("/")
              .filter((p) => p && !p.startsWith("(") && !p.startsWith("@"))
              .join("/");
        else if (
          config.project.framework === "next" &&
          /(?:^|\/)pages$/.test(configured) &&
          /\.[jt]sx?$/.test(path) &&
          !/(?:^|\/)(?:_|api\/)/.test(path)
        )
          route =
            "/" + path.replace(/\.[jt]sx?$/, "").replace(/(?:^|\/)index$/, "");
        else if (
          config.project.framework === "svelte" &&
          /(?:^|\/)\+page\.svelte$/.test(path)
        )
          route =
            "/" +
            path
              .replace(/(?:^|\/)\+page\.svelte$/, "")
              .split("/")
              .filter((p) => p && !p.startsWith("("))
              .join("/");
        if (route)
          found.push({
            path: route,
            file: relative(root, file).replaceAll("\\", "/"),
          });
      }
    };
    await walk(base);
  }
  return [...new Map(found.map((r) => [r.path, r])).values()];
}
function matches(pattern: string, path: string) {
  const parts = pattern
    .split("/")
    .map((p) =>
      p.startsWith("[") ? "[^/]+" : p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    );
  return new RegExp("^" + parts.join("/") + "/?$").test(path);
}
export function coverageFindings(
  discovered: { path: string; file: string }[],
  routes: Route[],
  criticalRoutes: string[] = [],
) {
  const registered = routes.flatMap((r) => [
    r.path,
    ...r.states.flatMap((s) => (s.path ? [s.path] : [])),
  ]);
  return [
    ...discovered,
    ...criticalRoutes.map((path) => ({ path, file: "inteiro.config.json" })),
  ]
    .filter((d) => !registered.some((path) => matches(d.path, path)))
    .map((d) =>
      finding(
        "VIS-COVER-001",
        "Discovered route has no declared fixture/state coverage: " + d.path,
        { route: d.path, file: d.file, status: "blocked" },
      ),
    );
}
