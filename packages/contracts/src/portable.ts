import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { dirname, basename } from "node:path";
import {
  hash,
  validateSchema,
  aggregate,
  exitCode,
  safePath,
  safeRead,
  readEvidence,
  type EvidenceBundle,
} from "./index.ts";

const MAX_BYTES = 64 * 1024 * 1024;
const MAX_FILES = 10000;
interface PortableFile {
  path: string;
  sha256: string;
  mediaType: string;
  privacyClass: "public" | "internal" | "restricted";
  data: string;
}
interface PortableArchive {
  schemaVersion: "1.0";
  kind: "inteiro-portable-evidence";
  sourceReportHash: string;
  createdAt: string;
  files: PortableFile[];
  hash: string;
}
function portablePath(path: unknown): asserts path is string {
  if (
    typeof path !== "string" ||
    !path ||
    path.includes("\\") ||
    path.startsWith("/") ||
    path.includes(":") ||
    /[\x00-\x1f]/.test(path) ||
    path
      .split("/")
      .some(
        (part) =>
          !part ||
          part === "." ||
          part === ".." ||
          /[. ]$/.test(part) ||
          /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(part),
      )
  )
    throw Error("Unsafe portable artifact path");
}
function reportIntegrity(report: EvidenceBundle) {
  const { hash: expected, ...payload } = report;
  if (
    !validateSchema("evidence-bundle", report).valid ||
    hash(payload) !== expected ||
    aggregate(report.gates) !== report.status ||
    (report.exitCode !== undefined &&
      report.exitCode !== exitCode(report.status))
  )
    throw Error("Portable summary integrity or status mismatch");
}
function verifyArchive(archive: PortableArchive) {
  const { hash: expected, ...payload } = archive;
  if (
    archive.schemaVersion !== "1.0" ||
    archive.kind !== "inteiro-portable-evidence" ||
    hash(payload) !== expected ||
    !Array.isArray(archive.files) ||
    !archive.files.length ||
    archive.files.length > MAX_FILES
  )
    throw Error("Invalid portable evidence archive");
  const names = new Set<string>();
  let total = 0;
  for (const file of archive.files) {
    portablePath(file.path);
    if (
      file.path === "manifest.json" ||
      names.has(file.path.toLowerCase()) ||
      !["public", "internal", "restricted"].includes(file.privacyClass) ||
      typeof file.mediaType !== "string" ||
      typeof file.data !== "string" ||
      file.data.length > Math.ceil(MAX_BYTES / 3) * 4
    )
      throw Error("Invalid or duplicate portable artifact");
    names.add(file.path.toLowerCase());
    const bytes = Buffer.from(file.data, "base64");
    total += bytes.length;
    if (
      total > MAX_BYTES ||
      bytes.toString("base64") !== file.data ||
      hash(bytes) !== file.sha256
    )
      throw Error("Portable artifact size or hash mismatch");
  }
  const summary = archive.files.find((file) => file.path === "summary.json");
  if (!summary) throw Error("Portable summary missing");
  const report = JSON.parse(
    Buffer.from(summary.data, "base64").toString(),
  ) as EvidenceBundle;
  reportIntegrity(report);
  if (report.hash !== archive.sourceReportHash)
    throw Error("Portable source report mismatch");
  for (const artifact of report.artifacts) {
    portablePath(artifact.path);
    if (
      artifact.relativePath !== undefined &&
      artifact.relativePath !== artifact.path
    )
      throw Error("Contradictory portable artifact identity");
    const file = archive.files.find((file) => file.path === artifact.path);
    if (!file || file.sha256 !== artifact.sha256)
      throw Error("Summary artifact not included in portable archive");
  }
  return report;
}
export async function exportEvidenceArchive(
  root: string,
  summaryPath: string,
  archivePath: string,
) {
  const report = await readEvidence(root, summaryPath);
  reportIntegrity(report);
  const files: PortableFile[] = [];
  let total = 0;
  const include = async (
    path: string,
    source: string,
    mediaType: string,
    privacyClass: PortableFile["privacyClass"] = "internal",
  ) => {
    portablePath(path);
    const absolute = safePath(root, source);
    const info = await stat(absolute);
    if (
      !info.isFile() ||
      info.size > MAX_BYTES ||
      total + info.size > MAX_BYTES
    )
      throw Error("Portable evidence byte budget exceeded");
    const bytes = await readFile(absolute);
    total += bytes.length;
    files.push({
      path,
      sha256: hash(bytes),
      mediaType,
      privacyClass,
      data: bytes.toString("base64"),
    });
  };
  await include("summary.json", summaryPath, "application/json");
  for (const artifact of report.artifacts)
    await include(
      artifact.path,
      artifact.path,
      artifact.mediaType ?? "application/octet-stream",
      artifact.privacyClass ?? "internal",
    );
  for (const name of [
    "context.json",
    "environment.json",
    "coverage.json",
    "review.json",
    "repair.json",
  ]) {
    const source =
      dirname(summaryPath) +
      (basename(summaryPath) === "latest.json" ? "/" + report.runId : "") +
      "/" +
      name;
    try {
      await include(name, source, "application/json");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  const payload = {
    schemaVersion: "1.0" as const,
    kind: "inteiro-portable-evidence" as const,
    createdAt: new Date().toISOString(),
    sourceReportHash: report.hash,
    files,
  };
  const archive = { ...payload, hash: hash(payload) };
  verifyArchive(archive);
  const bytes = Buffer.from(JSON.stringify(archive));
  const target = safePath(root, archivePath);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, bytes, { flag: "wx" });
  return {
    status: "passed" as const,
    kind: "portable-evidence-export",
    path: archivePath,
    sha256: hash(bytes),
    files: files.length,
    bytes: total,
    sourceReportHash: report.hash,
  };
}
export async function extractEvidenceArchive(
  root: string,
  archivePath: string,
  destination: string,
) {
  const source = safePath(root, archivePath);
  if ((await stat(source)).size > MAX_BYTES * 1.5)
    throw Error("Portable archive transport limit exceeded");
  const archive = JSON.parse(
    await safeRead(root, archivePath),
  ) as PortableArchive;
  const report = verifyArchive(archive);
  const target = safePath(root, destination);
  await mkdir(target); // Never overwrite an extraction or existing checkout.
  for (const file of archive.files) {
    const path = safePath(target, file.path);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, Buffer.from(file.data, "base64"), { flag: "wx" });
  }
  const index = {
    schemaVersion: "1.0",
    kind: "extracted-evidence-manifest",
    archiveHash: archive.hash,
    sourceReportHash: report.hash,
    files: archive.files.map(({ data: _, ...metadata }) => metadata),
  };
  await writeFile(
    safePath(target, "manifest.json"),
    JSON.stringify({ ...index, hash: hash(index) }, null, 2),
    { flag: "wx" },
  );
  return verifyExtractedEvidence(target);
}
export async function verifyExtractedEvidence(root: string) {
  const index = JSON.parse(await safeRead(root, "manifest.json"));
  const { hash: expected, ...payload } = index;
  if (
    index.schemaVersion !== "1.0" ||
    index.kind !== "extracted-evidence-manifest" ||
    hash(payload) !== expected ||
    !Array.isArray(index.files) ||
    index.files.length > MAX_FILES
  )
    throw Error("Invalid extracted evidence manifest");
  const names = new Set<string>();
  let total = 0;
  for (const file of index.files) {
    portablePath(file.path);
    if (names.has(file.path.toLowerCase()))
      throw Error("Duplicate extracted artifact");
    names.add(file.path.toLowerCase());
    const path = safePath(root, file.path),
      info = await stat(path);
    total += info.size;
    if (
      !info.isFile() ||
      total > MAX_BYTES ||
      hash(await readFile(path)) !== file.sha256
    )
      throw Error("Extracted evidence bytes changed");
  }
  const report = await readEvidence(root, "summary.json");
  reportIntegrity(report);
  if (report.hash !== index.sourceReportHash)
    throw Error("Extracted source report changed");
  return {
    status: "passed" as const,
    kind: "portable-evidence-verification",
    sourceReportHash: report.hash,
    files: index.files.length,
    bytes: total,
  };
}
