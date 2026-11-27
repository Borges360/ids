import { execFileSync } from "node:child_process";
export interface ImpactRoute {
  id: string;
  sourceFiles?: string[];
}
export function selectRouteImpact(
  routes: ImpactRoute[],
  changedFiles: string[] | undefined,
  profile: string,
) {
  const full = (reason: string) => ({
    scope: "full" as const,
    reason,
    routeIds: routes.map((route) => route.id),
    changedFiles: changedFiles ?? [],
  });
  if (["ci", "main", "nightly", "release"].includes(profile))
    return full("protected-profile");
  if (!changedFiles?.length) return full("change-set-unknown-or-empty");
  if (
    changedFiles.some(
      (path) =>
        /(?:^|\/)(?:package(?:-lock)?\.json|inteiro\.(?:config|routes)\.json|.*(?:policy|governance|attestation).*)$/i.test(
          path,
        ) || /^(?:\.inteiro|\.github|scripts|packages\/tokens)\//.test(path),
    )
  )
    return full("shared-contract-or-policy-change");
  const affected = new Set<string>();
  for (const path of changedFiles) {
    const matching = routes.filter((route) =>
      route.sourceFiles?.includes(path),
    );
    if (!matching.length) return full("unmapped-source-or-dependency");
    matching.forEach((route) => affected.add(route.id));
  }
  if (routes.some((route) => !route.sourceFiles?.length))
    return full("incomplete-route-dependency-inventory");
  return {
    scope: "affected" as const,
    reason: "explicit-route-dependency-contract",
    routeIds: [...affected],
    changedFiles,
  };
}
export function changedSourceFiles(root: string): string[] | undefined {
  try {
    const run = (args: string[]) =>
      execFileSync("git", args, {
        cwd: root,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      })
        .split("\0")
        .filter(Boolean);
    return [
      ...new Set([
        ...run(["diff", "--name-only", "-z", "HEAD"]),
        ...run(["ls-files", "--others", "--exclude-standard", "-z"]),
      ]),
    ];
  } catch {
    return undefined;
  }
}
