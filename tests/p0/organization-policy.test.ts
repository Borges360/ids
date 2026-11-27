import { it, expect } from "vitest";
import { mkdtemp, mkdir, writeFile, rm, realpath } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, basename, dirname } from "node:path";
import {
  DEFAULTS,
  resolveConfig,
  type OrganizationPolicy,
} from "@inteiro/contracts";

async function fixture(
  run: (
    root: string,
    file: (policy: unknown) => Promise<void>,
  ) => Promise<void>,
) {
  const root = await mkdtemp(join(tmpdir(), "inteiro-policy-"));
  await mkdir(join(root, ".inteiro"));
  try {
    await run(root, (policy) =>
      writeFile(
        join(root, ".inteiro/organization-policy.json"),
        JSON.stringify(
          policy && typeof policy === "object" && !Array.isArray(policy)
            ? { schemaVersion: "1.0", ...policy }
            : policy,
        ),
      ),
    );
  } finally {
    const target = await realpath(root);
    if (
      dirname(target) !== (await realpath(tmpdir())) ||
      !basename(target).startsWith("inteiro-policy-")
    )
      throw new Error("Unexpected fixture cleanup target");
    await rm(target, { recursive: true, force: true });
  }
}

it("preserves the strictest budgets across flags and both organization sources", async () =>
  fixture(async (root, file) => {
    await file({
      repair: { maxAttempts: 8, maxChangedFiles: 20, maxDiffLines: 900 },
      context: { maxTokens: 3000 },
      browser: { timeoutMs: 5000 },
      visual: { maxDiffPixelRatio: 0.4, colorThreshold: 0.7 },
    });
    const flags = {
      repair: { maxAttempts: 10, maxChangedFiles: 100, maxDiffLines: 100000 },
      context: { maxTokens: 10000 },
      browser: { timeoutMs: 9000 },
      visual: { maxDiffPixelRatio: 1, colorThreshold: 1 },
    };
    const { config, origins } = await resolveConfig(root, flags, {
      repair: { maxAttempts: 1, maxChangedFiles: 3, maxDiffLines: 100 },
      context: { maxTokens: 1000 },
      browser: { timeoutMs: 2000 },
      visual: { maxDiffPixelRatio: 0.001, colorThreshold: 0.01 },
    });
    expect(config.repair).toEqual({
      maxAttempts: 1,
      maxChangedFiles: 3,
      maxDiffLines: 100,
    });
    expect(config.context.maxTokens).toBe(1000);
    expect(config.browser.timeoutMs).toBe(2000);
    expect(config.visual.maxDiffPixelRatio).toBe(0.001);
    expect(config.visual.colorThreshold).toBe(0.01);
    expect(origins["repair.maxAttempts"]).toBe("organization-policy");
    expect(flags.repair.maxAttempts).toBe(10);
    expect(DEFAULTS.repair.maxAttempts).toBe(2);
    expect(
      (await resolveConfig(root, {}, { repair: { maxAttempts: 0 } })).config
        .repair.maxAttempts,
    ).toBe(0);
  }));

it("intersects origin permissions and blocks a nonlocal base URL that policy forbids", async () =>
  fixture(async (root, file) => {
    await file({
      browser: {
        allowedOrigins: [
          "https://approved.invalid",
          "https://unexpected.invalid",
        ],
      },
    });
    const flags = {
      browser: {
        baseURL: "https://unexpected.invalid",
        allowedOrigins: [
          "https://approved.invalid",
          "https://unexpected.invalid",
        ],
      },
    };
    await expect(
      resolveConfig(root, flags, {
        browser: { allowedOrigins: ["https://approved.invalid"] },
      }),
    ).rejects.toThrow("Nonlocal baseURL");
    const result = await resolveConfig(
      root,
      {
        ...flags,
        browser: { ...flags.browser, baseURL: "https://approved.invalid" },
      },
      { browser: { allowedOrigins: ["HTTPS://APPROVED.invalid/"] } },
    );
    expect(result.config.browser.allowedOrigins).toEqual([
      "https://approved.invalid",
    ]);
    await file({ browser: { allowedOrigins: [] } });
    await expect(resolveConfig(root, flags)).rejects.toThrow(
      "Nonlocal baseURL",
    );
  }));

it("never disables mandatory checks or removes required classifications", async () =>
  fixture(async (root, file) => {
    await file({
      design: { strictTokens: false },
      context: { requireProof: false },
      review: { allowExternalProvider: true, requiredFor: ["component"] },
      reporting: { formats: ["sarif"] },
      visual: { fullPage: false },
    });
    const { config } = await resolveConfig(
      root,
      {
        design: { strictTokens: false },
        context: { requireProof: false },
        review: { allowExternalProvider: true, requiredFor: [] },
        reporting: { formats: ["json"] },
        visual: { fullPage: false },
      },
      {
        design: { strictTokens: true },
        context: { requireProof: true },
        review: { allowExternalProvider: false, requiredFor: ["fix"] },
        visual: { fullPage: true },
      },
    );
    expect(config.design.strictTokens).toBe(true);
    expect(config.context.requireProof).toBe(true);
    expect(config.review.allowExternalProvider).toBe(false);
    expect(config.review.requiredFor).toEqual(["fix", "component"]);
    expect(config.visual.fullPage).toBe(true);
    expect(config.reporting.formats).toEqual(["json", "sarif"]);
  }));

it("retains mandatory scans and adoption despite a broader project exclusion", async () =>
  fixture(async (root, file) => {
    await file({
      static: {
        adoption: "observe",
        include: ["legacy/**/*.vue"],
        exclude: ["**/dist/**"],
        forbiddenImports: ["unsafe-b"],
        forbiddenTokens: ["unsafe-token"],
      },
    });
    const { config } = await resolveConfig(
      root,
      {
        static: {
          adoption: "observe",
          include: ["src/**/*.tsx"],
          exclude: ["src/**", "**/dist/**"],
          forbiddenImports: ["unsafe-a"],
        },
      },
      {
        static: {
          adoption: "enforce-new",
          include: ["mandatory/**/*.html"],
          exclude: ["**/dist/**"],
        },
      },
    );
    expect(config.static.adoption).toBe("enforce-new");
    expect(config.static.include).toEqual([
      "src/**/*.tsx",
      "mandatory/**/*.html",
      "legacy/**/*.vue",
    ]);
    expect(config.static.exclude).toEqual(["**/dist/**"]);
    expect(config.static.forbiddenImports).toEqual(["unsafe-a", "unsafe-b"]);
    expect(config.static.forbiddenTokens).toEqual(["unsafe-token"]);
    expect(
      (
        await resolveConfig(
          root,
          { static: { adoption: "enforce-all" } },
          { static: { adoption: "enforce-new" } },
        )
      ).config.static.adoption,
    ).toBe("enforce-all");
  }));

it("cannot turn disjoint pattern permissions into an unrestricted empty list", async () =>
  fixture(async (root, file) => {
    await file({ composition: { allowed: ["form-layout", "dialog"] } });
    expect(
      (
        await resolveConfig(
          root,
          { composition: { allowed: [] } },
          { composition: { allowed: ["form-layout", "data-table"] } },
        )
      ).config.composition.allowed,
    ).toEqual(["form-layout"]);
    await expect(
      resolveConfig(root, { composition: { allowed: ["data-table"] } }),
    ).rejects.toThrow("permit no composition");
    await file({ composition: { allowed: [] } });
    expect(
      (await resolveConfig(root, { composition: { allowed: ["data-table"] } }))
        .config.composition.allowed,
    ).toEqual(["data-table"]);
  }));

it("pins mandatory viewports and font hashes and rejects incompatible policy pins", async () =>
  fixture(async (root, file) => {
    const policy: OrganizationPolicy = {
      browser: {
        viewports: [{ id: "mobile", width: 375, height: 812 }],
        requiredFonts: ["Recursive"],
        criticalRoutes: ["account"],
        fontAssets: [{ path: "font.woff2", sha256: "a".repeat(64) }],
      },
    };
    const flags = {
      browser: {
        viewports: [{ id: "mobile", width: 1440, height: 900 }],
        fontAssets: [{ path: "font.woff2", sha256: "b".repeat(64) }],
      },
    };
    const { config } = await resolveConfig(root, flags, policy);
    expect(config.browser.viewports).toEqual(policy.browser!.viewports);
    expect(config.browser.fontAssets).toEqual(policy.browser!.fontAssets);
    expect(config.browser.requiredFonts).toEqual(["Recursive"]);
    expect(config.browser.criticalRoutes).toEqual(["account"]);
    await file({
      browser: { viewports: [{ id: "mobile", width: 320, height: 812 }] },
    });
    await expect(resolveConfig(root, flags, policy)).rejects.toThrow(
      "Conflicting organization viewport",
    );
    await file({
      browser: { fontAssets: [{ path: "font.woff2", sha256: "c".repeat(64) }] },
    });
    await expect(resolveConfig(root, flags, policy)).rejects.toThrow(
      "Conflicting organization font",
    );
  }));

it("rejects misspelled, unsupported and invalid policy constraints before execution", async () =>
  fixture(async (root) => {
    for (const policy of [
      { repair: { maxAttemps: 2 } },
      { repair: { maxAttempts: -1 } },
      { context: { maxTokens: 0 } },
      { browser: { timeoutMs: 1.5 } },
      {
        browser: {
          allowedOrigins: ["https://fixture-only:password@approved.invalid"],
        },
      },
      { browser: { allowedOrigins: ["https://approved.invalid/path"] } },
      { browser: { allowedOrigins: ["https://approved.invalid/path/.."] } },
      { review: { requiredFor: ["new-pgae"] } },
      { reporting: { formats: ["xml"] } },
      { visual: { policy: "auto-approve" } },
      { project: { root: ".." } },
    ]) {
      await expect(resolveConfig(root, {}, policy as never)).rejects.toThrow();
    }
    await expect(
      resolveConfig(root, {
        browser: { baseURL: "http://fixture-only:password@127.0.0.1" },
      }),
    ).rejects.toThrow("credentials");
  }));

it("requires an explicit version in the policy file", async () =>
  fixture(async (root) => {
    await writeFile(
      join(root, ".inteiro/organization-policy.json"),
      JSON.stringify({ repair: { maxAttempts: 1 } }),
    );
    await expect(resolveConfig(root)).rejects.toThrow(
      "Invalid organization policy",
    );
  }));
