import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { stringify } from "yaml";

const root = resolve(import.meta.dirname, "..");
const { values } = parseArgs({
  options: {
    case: { type: "string" },
    mode: { type: "string", default: "inspect" },
    cli: { type: "string", default: join(root, "packages", "cli", "dist", "cli.cjs") },
  },
});
if (!["inspect", "check"].includes(values.mode)) {
  throw new Error("--mode must be inspect or check.");
}

const manifest = JSON.parse(await readFile(join(root, "benchmarks", "manifest.json"), "utf8"));
const cases = values.case
  ? manifest.cases.filter((item) => item.id === values.case)
  : manifest.cases;
if (!cases.length) throw new Error(`Unknown benchmark case: ${values.case}`);

function run(executable, args, options = {}) {
  return new Promise((resolveRun) => {
    const child = spawn(executable, args, {
      ...options,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.once("close", (code, signal) => resolveRun({ code, signal, stdout, stderr }));
    child.once("error", (error) =>
      resolveRun({ code: null, signal: null, stdout, stderr: `${stderr}${error}` }),
    );
  });
}

await mkdir(join(root, "benchmarks", "results"), { recursive: true });
for (const item of cases) {
  const started = Date.now();
  const temporary = await mkdtemp(join(tmpdir(), `patchproof-benchmark-${item.id}-`));
  const repository = join(temporary, "repository");
  let result;
  try {
    const clone = await run(
      "git",
      ["clone", "--filter=blob:none", "--no-checkout", item.repository, repository],
      { cwd: temporary },
    );
    if (clone.code !== 0) throw new Error(clone.stderr || clone.stdout);
    const fetch = await run("git", ["fetch", "origin", item.base, item.head], {
      cwd: repository,
    });
    if (fetch.code !== 0) throw new Error(fetch.stderr || fetch.stdout);
    const checkout = await run("git", ["checkout", "--detach", item.head], {
      cwd: repository,
    });
    if (checkout.code !== 0) throw new Error(checkout.stderr || checkout.stdout);

    const configPath = join(temporary, ".patchproof-benchmark.yml");
    await writeFile(
      configPath,
      stringify({
        version: 1,
        adapter: item.adapter,
        projectRoot: item.projectRoot,
        execution: {
          setup: item.setup,
          targetedTest: item.targetedTest,
          suite: item.suite,
          timeoutSeconds: item.timeoutSeconds,
          suiteTimeoutSeconds: item.timeoutSeconds,
        },
        tests: {
          include: item.include,
          exclude: [],
          support: item.support ?? [],
        },
        report: { format: "json", output: null },
      }),
      "utf8",
    );
    const args = [
      values.cli,
      values.mode,
      "--config",
      configPath,
      "--base",
      item.base,
      "--head",
      item.head,
      "--format",
      "json",
    ];
    if (values.mode === "check") args.push("--yes", "--quiet");
    const execution = await run(process.execPath, args, {
      cwd: repository,
      env: { ...process.env, CI: "true" },
    });
    let parsed = null;
    try {
      parsed = JSON.parse(execution.stdout);
    } catch {
      // The raw, bounded failure is retained below.
    }
    result = {
      schemaVersion: 1,
      id: item.id,
      repository: item.repository,
      base: item.base,
      head: item.head,
      title: item.title,
      mode: values.mode,
      expectedStatus: item.expectedStatus,
      actualStatus:
        values.mode === "inspect"
          ? parsed
            ? parsed.tests?.length
              ? "selected"
              : "no_tests"
            : null
          : (parsed?.aggregate ?? null),
      selectedTests: parsed?.tests ?? [],
      suite: parsed?.suite ?? null,
      durationMs: Date.now() - started,
      exitCode: execution.code,
      supported: parsed !== null,
      stdout: parsed ? undefined : execution.stdout.slice(-8000),
      stderr: execution.stderr.slice(-8000),
      recordedAt: new Date().toISOString(),
    };
  } catch (error) {
    result = {
      schemaVersion: 1,
      id: item.id,
      repository: item.repository,
      base: item.base,
      head: item.head,
      title: item.title,
      mode: values.mode,
      expectedStatus: item.expectedStatus,
      actualStatus: null,
      selectedTests: [],
      suite: null,
      durationMs: Date.now() - started,
      exitCode: null,
      supported: false,
      stderr: String(error).slice(-8000),
      recordedAt: new Date().toISOString(),
    };
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
  const filename = `${item.id}.${values.mode}.json`;
  await writeFile(
    join(root, "benchmarks", "results", filename),
    `${JSON.stringify(result, null, 2)}\n`,
    "utf8",
  );
  console.log(
    `${basename(filename)}: ${result.supported ? (result.actualStatus ?? "recorded") : "unsupported"}`,
  );
}
