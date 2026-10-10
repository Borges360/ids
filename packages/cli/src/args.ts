export interface ParsedArgs {
  command: string[];
  flags: Record<string, string | boolean>;
  positionals: string[];
}

export function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string | boolean> = {};
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "--") {
      rest.push(...argv.slice(i + 1));
      break;
    }
    if (arg.startsWith("--")) {
      const [rawKey, inline] = arg.slice(2).split("=");
      const key = rawKey!;
      if (inline !== undefined) flags[key] = inline;
      else if (argv[i + 1] && !argv[i + 1]!.startsWith("-")) {
        flags[key] = argv[i + 1]!;
        i += 1;
      } else flags[key] = true;
    } else if (arg.startsWith("-") && arg.length === 2) {
      flags[arg.slice(1)] = true;
    } else rest.push(arg);
  }
  return { command: rest, flags, positionals: rest };
}

export function flag(flags: Record<string, string | boolean>, name: string, fallback = ""): string {
  const value = flags[name];
  if (typeof value === "string") return value;
  return fallback;
}

export function bool(flags: Record<string, string | boolean>, name: string): boolean {
  return flags[name] === true || flags[name] === "true" || flags[name] === "1";
}

export const EXIT = {
  ok: 0,
  usage: 2,
  notFound: 3,
  invalid: 4,
  io: 5
} as const;
