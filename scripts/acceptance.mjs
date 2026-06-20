import { execFile } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const cli = process.argv[2];
if (!cli) throw new Error("Usage: node scripts/acceptance.mjs <patchproof executable>");

const root = await mkdtemp(join(tmpdir(), "patchproof-cli-acceptance-"));
await exec("git", ["init", "-b", "main"], { cwd: root });
await exec("git", ["config", "user.email", "fixture@example.com"], { cwd: root });
await exec("git", ["config", "user.name", "Fixture"], { cwd: root });
await mkdir(join(root, "tests"));
await writeFile(
  join(root, "package.json"),
  JSON.stringify({ type: "module", devDependencies: { vitest: "^3.0.0" } }),
);
await writeFile(join(root, "implementation.txt"), "buggy\n");
await writeFile(
  join(root, "run-test.mjs"),
  "import{readFileSync,existsSync}from'node:fs';if(!existsSync(process.argv[2]))process.exit(2);if(readFileSync('implementation.txt','utf8').trim()==='buggy'){console.error('AssertionError: expected fixed but got buggy');process.exit(1)}\n",
);
await writeFile(join(root, "suite.mjs"), "process.exit(0)\n");
await writeFile(
  join(root, ".patchproof.yml"),
  [
    "version: 1",
    "adapter: javascript",
    "execution:",
    '  setup: [node, "-e", ""]',
    '  targetedTest: [node, run-test.mjs, "{test_file}"]',
    "  suite: [node, suite.mjs]",
    "  timeoutSeconds: 10",
    "  suiteTimeoutSeconds: 10",
    "tests:",
    '  include: ["**/*.test.js"]',
  ].join("\n"),
);
await exec("git", ["add", "."], { cwd: root });
await exec("git", ["commit", "-m", "base"], { cwd: root });
const base = (
  await exec("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" })
).stdout.trim();
await writeFile(join(root, "implementation.txt"), "fixed\n");
await writeFile(
  join(root, "tests", "regression.test.js"),
  "import { test, expect } from 'vitest';\ntest('fixed behavior', () => expect(true).toBe(true));\n",
);
await exec("git", ["add", "."], { cwd: root });
await exec("git", ["commit", "-m", "fix with regression test"], { cwd: root });
const head = (
  await exec("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" })
).stdout.trim();

const command =
  process.platform === "win32"
    ? { executable: "cmd.exe", args: ["/d", "/s", "/c", "call", cli] }
    : { executable: cli, args: [] };
const { stdout: inspectionOutput } = await exec(
  command.executable,
  [...command.args, "inspect", "--base", base, "--head", head, "--format", "json"],
  { cwd: root, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
);
const inspection = JSON.parse(inspectionOutput);
if (
  inspection.tests?.[0]?.id !== "tests/regression.test.js::fixed behavior" ||
  inspection.repository?.root !== "<repository>"
) {
  throw new Error(`Acceptance inspection failed.\n${inspectionOutput}`);
}
const { stdout, stderr } = await exec(
  command.executable,
  [
    ...command.args,
    "check",
    "--base",
    base,
    "--head",
    head,
    "--yes",
    "--format",
    "json",
    "--quiet",
  ],
  { cwd: root, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
);
const report = JSON.parse(stdout);
if (report.aggregate !== "proven" || report.tests?.[0]?.status !== "proven") {
  throw new Error(`Acceptance proof failed.\n${stdout}\n${stderr}`);
}
console.log(`Packaged CLI acceptance passed in ${root}`);
