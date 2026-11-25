import { allTokens } from "@inteiro/tokens";
import { patterns } from "@inteiro/composition";
import { hash, validateSchema, type Config } from "@inteiro/contracts";
export function projectContracts(config: Config) {
  const base = {
    schemaVersion: "1.0",
    inteiroVersion: "2.0.0-rc.1",
    configId: config.project.id,
    createdAt: new Date().toISOString(),
  };
  const create = (name: string, fields: Record<string, unknown>) => {
    const contract = {
      ...base,
      ...fields,
      hash: hash({
        schemaVersion: base.schemaVersion,
        inteiroVersion: base.inteiroVersion,
        configId: base.configId,
        ...fields,
      }),
    };
    const valid = validateSchema(name, contract);
    if (!valid.valid)
      throw new Error("Invalid " + name + ": " + JSON.stringify(valid.errors));
    return contract;
  };
  return {
    designContract: create("design-contract", {
      tokens: allTokens()
        .filter((t) => t.layer === "semantic")
        .map((t) => t.id),
      patterns: patterns
        .filter(
          (p) =>
            !config.composition.allowed.length ||
            config.composition.allowed.includes(p.id),
        )
        .map((p) => p.id),
      themes: config.design.theme,
      densities: config.design.density,
    }),
    implementationContract: create("implementation-contract", {
      framework: config.project.framework,
      allowedImports: [
        "@inteiro/tokens",
        "@inteiro/design-system",
        "@inteiro/composition",
      ],
      restrictions: {
        strictTokens: config.design.strictTokens,
        forbiddenImports: config.static.forbiddenImports,
        ...config.repair,
      },
      checks: ["context", "static", "browser", "review"],
    }),
    visualAcceptanceContract: create("visual-acceptance-contract", {
      routes: [],
      routesFile: config.browser.routesFile,
      viewports: config.browser.viewports,
      policy: config.visual,
      environment: config.browser.environment,
    }),
  };
}
