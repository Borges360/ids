import type { Capabilities } from "./contracts.ts";
export interface Environment {
  inputTTY: boolean;
  outputTTY: boolean;
  uiTTY: boolean;
  columns?: number;
  rows?: number;
  env?: Record<string, string | undefined>;
  json?: boolean;
  noInput?: boolean;
  mode?: Capabilities["mode"];
  color?: "auto" | "always" | "never";
  ascii?: boolean;
  reducedMotion?: boolean;
  host?: boolean;
}
export function detectCapabilities(e: Environment): Capabilities {
  const env = e.env ?? {},
    interactive =
      e.inputTTY && e.uiTTY && e.outputTTY && !e.noInput && !e.json && !env.CI;
  const screen = interactive && env.TERM !== "dumb";
  const mode = e.json
    ? "json"
    : e.host
      ? "host"
      : !interactive
        ? "linear"
        : (e.mode ?? (screen ? "prompts" : "linear"));
  return {
    interactive,
    columns: Math.max(1, Math.floor(e.columns ?? 80)),
    rows: Math.max(1, Math.floor(e.rows ?? 24)),
    color:
      !e.json &&
      e.color !== "never" &&
      (e.color === "always" ||
        (e.uiTTY && !!env.TERM && env.TERM !== "dumb" && !env.NO_COLOR)),
    unicode: !e.ascii,
    advancedKeyboard: false,
    mouse: false,
    screen: screen && mode !== "linear" && mode !== "json",
    mode,
    reducedMotion: e.reducedMotion ?? true,
  };
}
export function requireInput(
  capabilities: Capabilities,
  missing: readonly string[],
) {
  if (missing.length && !capabilities.interactive)
    return {
      status: "invalid" as const,
      message: `Entrada necessária: ${missing.join(", ")}. Informe os argumentos em modo sem entrada.`,
    };
  return undefined;
}
