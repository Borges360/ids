import { inflateRawSync } from "node:zlib";
import { redact } from "@inteiro/contracts";
import { validateSyntheticText } from "./actions.ts";
const MAX_ENTRY = 16 * 1024 * 1024,
  MAX_TOTAL = 64 * 1024 * 1024;
const crcTable = Array.from({ length: 256 }, (_, value) => {
  for (let i = 0; i < 8; i++)
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
const crc32 = (bytes: Buffer) => {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

/** Reads bounded, non-encrypted, single-volume Playwright ZIPs without extracting files. */
function traceEntries(bytes: Buffer) {
  if (bytes.length > MAX_TOTAL)
    throw Error("Trace transport exceeds privacy inspection budget");
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
    if (bytes.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  if (
    end < 0 ||
    bytes.readUInt16LE(end + 4) !== 0 ||
    bytes.readUInt16LE(end + 6) !== 0
  )
    throw Error("Unsupported trace ZIP volume");
  const count = bytes.readUInt16LE(end + 10),
    size = bytes.readUInt32LE(end + 12),
    offset = bytes.readUInt32LE(end + 16);
  if (
    count === 0 ||
    count > 10000 ||
    offset + size !== end ||
    bytes.readUInt16LE(end + 8) !== count ||
    end + 22 + bytes.readUInt16LE(end + 20) !== bytes.length
  )
    throw Error("Invalid or ZIP64 trace directory");
  const entries: { name: string; bytes: Buffer }[] = [],
    names = new Set<string>();
  let cursor = offset,
    total = 0;
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > end || bytes.readUInt32LE(cursor) !== 0x02014b50)
      throw Error("Invalid trace ZIP entry");
    const flags = bytes.readUInt16LE(cursor + 8),
      method = bytes.readUInt16LE(cursor + 10),
      crc = bytes.readUInt32LE(cursor + 16),
      compressed = bytes.readUInt32LE(cursor + 20),
      uncompressed = bytes.readUInt32LE(cursor + 24),
      nameLength = bytes.readUInt16LE(cursor + 28),
      extra = bytes.readUInt16LE(cursor + 30),
      comment = bytes.readUInt16LE(cursor + 32),
      local = bytes.readUInt32LE(cursor + 42);
    const nameBytes = bytes.subarray(cursor + 46, cursor + 46 + nameLength),
      name = nameBytes.toString("utf8");
    cursor += 46 + nameLength + extra + comment;
    total += uncompressed;
    if (
      flags & 1 ||
      ![0, 8].includes(method) ||
      uncompressed > MAX_ENTRY ||
      total > MAX_TOTAL ||
      cursor > end ||
      !name ||
      name.startsWith("/") ||
      name.includes("\\") ||
      name.includes(":") ||
      name.split("/").some((part) => !part || part === "." || part === "..") ||
      names.has(name.toLowerCase())
    )
      throw Error("Unsafe or oversized trace ZIP entry");
    names.add(name.toLowerCase());
    if (
      local + 30 > offset ||
      bytes.readUInt32LE(local) !== 0x04034b50 ||
      bytes.readUInt16LE(local + 8) !== method
    )
      throw Error("Invalid trace local header");
    const localName = bytes.readUInt16LE(local + 26),
      localExtra = bytes.readUInt16LE(local + 28),
      start = local + 30 + localName + localExtra;
    if (
      !bytes.subarray(local + 30, local + 30 + localName).equals(nameBytes) ||
      start + compressed > offset
    )
      throw Error("Contradictory trace ZIP identity");
    const data = bytes.subarray(start, start + compressed),
      decoded =
        method === 0
          ? data
          : inflateRawSync(data, { maxOutputLength: MAX_ENTRY });
    if (decoded.length !== uncompressed || crc32(decoded) !== crc)
      throw Error("Trace ZIP integrity mismatch");
    entries.push({ name, bytes: decoded });
  }
  if (cursor !== end) throw Error("Unexpected trace directory data");
  return entries;
}
export function inspectTracePrivacy(
  bytes: Buffer,
  syntheticText: string[] = [],
) {
  if (!validateSyntheticText(syntheticText))
    throw Error("Trace exceptions require reserved synthetic addresses");
  const violations: { entry: string; reason: string }[] = [];
  let inspected = 0;
  for (const entry of traceEntries(bytes)) {
    const magic = entry.bytes.subarray(0, 12).toString("hex");
    if (
      /^(89504e470d0a1a0a|ffd8ff|47494638|774f4632|774f4646|00000100)/.test(
        magic,
      )
    )
      continue; // Synthetic image/font resources.
    const text = entry.bytes.toString("utf8");
    if (!Buffer.from(text).equals(entry.bytes)) {
      violations.push({
        entry: entry.name,
        reason: "opaque-resource-unverified",
      });
      continue;
    }
    inspected++;
    const safe = text.replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      (value) =>
        syntheticText.includes(value) ? "[SYNTHETIC-ADDRESS]" : value,
    );
    if (redact(safe) !== safe)
      violations.push({ entry: entry.name, reason: "sensitive-text" });
    for (const line of text.split("\n")) {
      try {
        const visit = (node: unknown): boolean => {
          if (Array.isArray(node)) return node.some(visit);
          if (!node || typeof node !== "object") return false;
          const data = node as Record<string, unknown>;
          if (
            typeof data.name === "string" &&
            /^(authorization|cookie|set-cookie)$/i.test(data.name) &&
            data.value
          )
            return true;
          return Object.entries(data).some(
            ([key, value]) =>
              (/^(cookies|localStorage|sessionStorage)$/i.test(key) &&
                Array.isArray(value) &&
                value.length > 0) ||
              visit(value),
          );
        };
        if (visit(JSON.parse(line)))
          violations.push({
            entry: entry.name,
            reason: "session-or-authorization-data",
          });
      } catch {
        /* Text, CSS and HTML still receive the conservative secret scan above. */
      }
    }
  }
  return {
    status: violations.length ? ("blocked" as const) : ("passed" as const),
    inspected,
    violations,
  };
}
