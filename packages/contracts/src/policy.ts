import type { Config } from "./index.ts";

type Constraints<T, K extends keyof T> = Partial<Pick<T, K>>;
/** Explicit constraints, rather than an unrestricted second project configuration. */
export interface OrganizationPolicy {
  $schema?: string;
  schemaVersion?: "1.0";
  design?: Constraints<Config["design"], "strictTokens" | "theme" | "density">;
  context?: Constraints<Config["context"], "requireProof" | "maxTokens">;
  composition?: Constraints<Config["composition"], "allowed">;
  static?: Constraints<
    Config["static"],
    "adoption" | "include" | "exclude" | "forbiddenImports" | "forbiddenTokens"
  >;
  browser?: Constraints<
    Config["browser"],
    | "allowedOrigins"
    | "requiredFonts"
    | "fontAssets"
    | "criticalRoutes"
    | "viewports"
    | "timeoutMs"
  >;
  visual?: Constraints<
    Config["visual"],
    "maxDiffPixelRatio" | "colorThreshold" | "fullPage"
  >;
  review?: Constraints<
    Config["review"],
    "requiredFor" | "allowExternalProvider"
  >;
  repair?: Partial<Config["repair"]>;
  reporting?: Constraints<Config["reporting"], "formats">;
}

export function normalizeOrigin(value: string): string {
  try {
    if (!/^[a-z][a-z0-9+.-]*:\/\/[^/?#]+\/?$/i.test(value.trim()))
      throw new Error();
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      throw new Error();
    return url.origin;
  } catch {
    throw new Error("Invalid allowed origin");
  }
}

const union = <T>(a: T[], b: T[]) => [...new Set([...a, ...b])];

/** Mutates only the resolved copy. Every layer can tighten, never relax another. */
export function applyOrganizationPolicies(
  config: Config,
  policies: OrganizationPolicy[],
): void {
  const mandatoryViewports = new Map<
    string,
    Config["browser"]["viewports"][number]
  >();
  const mandatoryAssets = new Map<string, string>();
  for (const policy of policies) {
    if (policy.design?.strictTokens) config.design.strictTokens = true;
    if (policy.design?.theme)
      config.design.theme = union(config.design.theme, policy.design.theme);
    if (policy.design?.density)
      config.design.density = union(
        config.design.density,
        policy.design.density,
      );
    if (policy.context?.requireProof) config.context.requireProof = true;
    if (policy.context?.maxTokens !== undefined)
      config.context.maxTokens = Math.min(
        config.context.maxTokens,
        policy.context.maxTokens,
      );
    if (policy.review?.allowExternalProvider === false)
      config.review.allowExternalProvider = false;
    if (policy.review?.requiredFor)
      config.review.requiredFor = union(
        config.review.requiredFor,
        policy.review.requiredFor,
      );
    for (const key of [
      "maxAttempts",
      "maxChangedFiles",
      "maxDiffLines",
    ] as const) {
      const limit = policy.repair?.[key];
      if (limit !== undefined)
        config.repair[key] = Math.min(config.repair[key], limit);
    }
    for (const key of ["maxDiffPixelRatio", "colorThreshold"] as const) {
      const limit = policy.visual?.[key];
      if (limit !== undefined)
        config.visual[key] = Math.min(config.visual[key], limit);
    }
    if (policy.visual?.fullPage) config.visual.fullPage = true;
    for (const key of [
      "forbiddenImports",
      "forbiddenTokens",
      "include",
    ] as const)
      if (policy.static?.[key])
        config.static[key] = union(config.static[key], policy.static[key]);
    // Exact common glob exclusions are conservative: different spellings scan more.
    if (policy.static?.exclude)
      config.static.exclude = config.static.exclude.filter((pattern) =>
        policy.static!.exclude!.includes(pattern),
      );
    if (policy.static?.adoption) {
      const levels = ["observe", "enforce-new", "enforce-all"];
      if (
        levels.indexOf(policy.static.adoption) >
        levels.indexOf(config.static.adoption)
      )
        config.static.adoption = policy.static.adoption;
    }
    if (policy.composition?.allowed?.length) {
      const allowed = config.composition.allowed.length
        ? config.composition.allowed.filter((id) =>
            policy.composition!.allowed!.includes(id),
          )
        : [...policy.composition.allowed];
      if (!allowed.length)
        throw new Error("Organization policies permit no composition patterns");
      config.composition.allowed = allowed;
    }
    if (policy.browser?.allowedOrigins) {
      const permitted = policy.browser.allowedOrigins.map(normalizeOrigin);
      config.browser.allowedOrigins = config.browser.allowedOrigins.filter(
        (origin) => permitted.includes(origin),
      );
    }
    if (policy.browser?.timeoutMs !== undefined)
      config.browser.timeoutMs = Math.min(
        config.browser.timeoutMs,
        policy.browser.timeoutMs,
      );
    for (const key of ["requiredFonts", "criticalRoutes"] as const)
      if (policy.browser?.[key])
        config.browser[key] = union(config.browser[key], policy.browser[key]);
    for (const viewport of policy.browser?.viewports ?? []) {
      const previous = mandatoryViewports.get(viewport.id);
      if (
        previous &&
        (previous.width !== viewport.width ||
          previous.height !== viewport.height)
      )
        throw new Error("Conflicting organization viewport constraints");
      mandatoryViewports.set(viewport.id, viewport);
      config.browser.viewports = [
        ...config.browser.viewports.filter((item) => item.id !== viewport.id),
        { ...viewport },
      ];
    }
    for (const asset of policy.browser?.fontAssets ?? []) {
      const previous = mandatoryAssets.get(asset.path);
      if (previous && previous !== asset.sha256)
        throw new Error("Conflicting organization font constraints");
      mandatoryAssets.set(asset.path, asset.sha256);
      config.browser.fontAssets = [
        ...config.browser.fontAssets.filter((item) => item.path !== asset.path),
        { ...asset },
      ];
    }
    if (policy.reporting?.formats)
      config.reporting.formats = union(
        config.reporting.formats,
        policy.reporting.formats,
      );
  }
}
