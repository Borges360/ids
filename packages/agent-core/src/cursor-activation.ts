import { parseDocument } from "yaml";

export function cursorActivation(text: string): {
  activation:
    "automatic" | "scoped" | "agent-requested" | "manual" | "unresolved";
  globCount: number;
} {
  try {
    const opening = text.match(/^\uFEFF?---[ \t]*\r?\n/);
    if (!opening) throw new Error();
    const tail = text.slice(opening[0].length);
    const closing = tail.search(/^---[ \t]*(?:\r?\n|$)/m);
    if (closing < 0 || closing > 16384) throw new Error();
    const header = tail.slice(0, closing);
    const document = parseDocument(header, { uniqueKeys: true });
    if (document.errors.length || document.warnings.length) throw new Error();
    const value: unknown =
      document.contents === null ? {} : document.toJS({ maxAliasCount: 0 });
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    const data = value as Record<string, unknown>;
    if (data.alwaysApply !== undefined && typeof data.alwaysApply !== "boolean")
      throw new Error();
    if (data.alwaysApply === true)
      return { activation: "automatic", globCount: 0 };
    if (
      data.globs != null &&
      typeof data.globs !== "string" &&
      (!Array.isArray(data.globs) ||
        data.globs.some((item) => typeof item !== "string"))
    )
      throw new Error();
    if (data.description != null && typeof data.description !== "string")
      throw new Error();
    const globs = (
      Array.isArray(data.globs) ? data.globs : [data.globs]
    ).filter(
      (item): item is string => typeof item === "string" && /[^\s,]/.test(item),
    );
    if (globs.length) return { activation: "scoped", globCount: globs.length };
    return {
      activation:
        typeof data.description === "string" && data.description.trim()
          ? "agent-requested"
          : "manual",
      globCount: 0,
    };
  } catch {
    return { activation: "unresolved", globCount: 0 };
  }
}
