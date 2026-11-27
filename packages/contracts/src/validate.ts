import Ajv from "ajv";
import { readFileSync } from "node:fs";
const ajv = new Ajv({ allErrors: true });
const cache = new Map<string, ReturnType<typeof ajv.compile>>();
export function validateSchema(name: string, value: unknown) {
  if (!/^[a-z-]+$/.test(name)) throw new Error("Invalid schema name");
  if (!cache.has(name))
    cache.set(
      name,
      ajv.compile(
        JSON.parse(
          readFileSync(
            new URL("../schemas/" + name + ".schema.json", import.meta.url),
            "utf8",
          ),
        ),
      ),
    );
  const validator = cache.get(name)!;
  return { valid: Boolean(validator(value)), errors: validator.errors ?? [] };
}
