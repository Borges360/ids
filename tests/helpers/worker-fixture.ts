import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  rm,
  realpath,
} from "node:fs/promises";
import { join, dirname, basename } from "node:path";
import { tmpdir } from "node:os";
export async function workerFixture(sourceRoot = process.cwd()) {
  const base = await mkdtemp(join(tmpdir(), "inteiro-workspace-")),
    dataset = join(base, "dataset"),
    target = join(base, "candidate");
  await mkdir(dataset);
  const source = JSON.parse(
      await readFile(join(sourceRoot, "benchmarks/tasks.public.json"), "utf8"),
    ),
    task = source.tasks[0];
  const paths = [
    ...task.initialFiles,
    task.instructions,
    task.contract,
    ...task.fixtures,
    task.grading.path,
    "benchmarks/contract/serve.mjs",
  ];
  if (task.validation) {
    const validation = JSON.parse(
      await readFile(join(sourceRoot, task.validation.path), "utf8"),
    );
    paths.push(
      task.validation.path,
      validation.routes.path,
      ...validation.fixtures.map((file: { path: string }) => file.path),
    );
    if (validation.reviewPolicy) paths.push(validation.reviewPolicy.path);
    if (validation.technicalPolicy) paths.push(validation.technicalPolicy.path);
  }
  for (const path of paths) {
    const destination = join(dataset, path);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, await readFile(join(sourceRoot, path)));
  }
  await writeFile(
    join(dataset, "benchmarks/tasks.public.json"),
    JSON.stringify({ ...source, tasks: [task] }),
  );
  await writeFile(
    join(dataset, "benchmarks/tasks.heldout.json"),
    JSON.stringify({ schemaVersion: "1.0", tasks: [] }),
  );
  return {
    base,
    dataset,
    target,
    task,
    async cleanup() {
      const actual = await realpath(base);
      if (
        dirname(actual) !== (await realpath(tmpdir())) ||
        !basename(actual).startsWith("inteiro-workspace-")
      )
        throw Error("Unsafe cleanup");
      await rm(actual, { recursive: true, force: true });
    },
  };
}
