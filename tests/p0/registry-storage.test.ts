import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  readdir,
  rename,
  rm,
} from "node:fs/promises";
import { setTimeout as wait } from "node:timers/promises";
import { basename, join, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { writeBaselineRegistry } from "../../packages/visual/src/registry-storage.ts";

vi.mock("node:fs/promises", async () => {
  const actual =
    await vi.importActual<typeof import("node:fs/promises")>(
      "node:fs/promises",
    );
  return { ...actual, rename: vi.fn(actual.rename) };
});
vi.mock("node:timers/promises", () => ({ setTimeout: vi.fn(async () => {}) }));

const platformDescriptor = Object.getOwnPropertyDescriptor(
  process,
  "platform",
)!;
let root: string;
beforeEach(async () => {
  const actual =
    await vi.importActual<typeof import("node:fs/promises")>(
      "node:fs/promises",
    );
  vi.mocked(rename).mockReset().mockImplementation(actual.rename);
  vi.mocked(wait).mockClear();
  root = await mkdtemp(join(tmpdir(), "inteiro-registry-"));
  await mkdir(join(root, "references"));
  await writeFile(join(root, "references/registry.json"), "[]\n");
});
afterEach(async () => {
  Object.defineProperty(process, "platform", platformDescriptor);
  if (
    !resolve(root).startsWith(resolve(tmpdir()) + sep) ||
    !basename(root).startsWith("inteiro-registry-")
  )
    throw Error("Unsafe test cleanup");
  await rm(root, { recursive: true, force: true });
});
const windows = () =>
  Object.defineProperty(process, "platform", {
    ...platformDescriptor,
    value: "win32",
  });
const failure = (code: string) =>
  Object.assign(new Error("Induced rename failure"), { code });

it("retries a transient Windows sharing error while preserving exact ledger history", async () => {
  windows();
  vi.mocked(rename)
    .mockRejectedValueOnce(failure("EPERM"))
    .mockRejectedValueOnce(failure("EBUSY"));
  await writeBaselineRegistry(root, "references", []);
  expect(rename).toHaveBeenCalledTimes(3);
  expect(wait).toHaveBeenNthCalledWith(1, 1000);
  expect(wait).toHaveBeenNthCalledWith(2, 2000);
  expect(await readFile(join(root, "references/registry.json"), "utf8")).toBe(
    "[]",
  );
  const history = await readdir(join(root, "references/history"));
  expect(history).toHaveLength(1);
  expect(
    await readFile(join(root, "references/history", history[0]!), "utf8"),
  ).toBe("[]\n");
  expect(
    (await readdir(join(root, "references"))).some((name) =>
      name.endsWith(".tmp"),
    ),
  ).toBe(false);
});

it("bounds Windows failures to three attempts and keeps the prior registry", async () => {
  windows();
  vi.mocked(rename).mockRejectedValue(failure("EPERM"));
  await expect(
    writeBaselineRegistry(root, "references", []),
  ).rejects.toMatchObject({ code: "EPERM" });
  expect(rename).toHaveBeenCalledTimes(3);
  expect(wait).toHaveBeenCalledTimes(2);
  expect(await readFile(join(root, "references/registry.json"), "utf8")).toBe(
    "[]\n",
  );
  expect(
    (await readdir(join(root, "references"))).some((name) =>
      name.endsWith(".tmp"),
    ),
  ).toBe(false);
});

it("does not retry unrelated filesystem errors", async () => {
  windows();
  vi.mocked(rename).mockRejectedValue(failure("ENOENT"));
  await expect(
    writeBaselineRegistry(root, "references", []),
  ).rejects.toMatchObject({ code: "ENOENT" });
  expect(rename).toHaveBeenCalledTimes(1);
  expect(wait).not.toHaveBeenCalled();
});

it("does not broaden retries to other operating systems", async () => {
  Object.defineProperty(process, "platform", {
    ...platformDescriptor,
    value: "linux",
  });
  vi.mocked(rename).mockRejectedValue(failure("EPERM"));
  await expect(
    writeBaselineRegistry(root, "references", []),
  ).rejects.toMatchObject({ code: "EPERM" });
  expect(rename).toHaveBeenCalledTimes(1);
  expect(wait).not.toHaveBeenCalled();
});
