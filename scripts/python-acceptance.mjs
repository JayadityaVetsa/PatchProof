import { execFile } from "node:child_process";
import { chmod, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const cli = process.argv[2];
if (!cli) throw new Error("Usage: node scripts/python-acceptance.mjs <patchproof executable>");

const root = await mkdtemp(join(tmpdir(), "PatchProof Python acceptance with spaces "));
const shims = join(root, "pip-less Python on PATH");
await mkdir(shims);
if (process.platform === "win32") {
  await writeFile(
    join(shims, "python.cmd"),
    "@echo off\r\necho No module named pip 1>&2\r\nexit /b 1\r\n",
  );
  await writeFile(
    join(shims, "python3.cmd"),
    "@echo off\r\necho No module named pip 1>&2\r\nexit /b 1\r\n",
  );
} else {
  for (const name of ["python", "python3"]) {
    const path = join(shims, name);
    await writeFile(path, "#!/bin/sh\necho 'No module named pip' >&2\nexit 1\n");
    await chmod(path, 0o755);
  }
}

await exec("git", ["init", "-b", "main"], { cwd: root });
await exec("git", ["config", "user.email", "fixture@example.com"], { cwd: root });
await exec("git", ["config", "user.name", "Fixture"], { cwd: root });
await mkdir(join(root, "tests"));
await writeFile(
  join(root, "pyproject.toml"),
  "[project]\nname='patchproof-python-fixture'\nversion='0.0.0'\n",
);
await writeFile(join(root, "implementation.txt"), "buggy\n");
await writeFile(
  join(root, "run_test.py"),
  [
    "import os, pathlib, sys",
    "temporary = pathlib.Path(os.environ['TEMP'])",
    "assert temporary.name == '.patchproof-tmp'",
    "temporary.mkdir(parents=True, exist_ok=True)",
    "(temporary / 'write-check').write_text('ok', encoding='utf-8')",
    "if pathlib.Path('implementation.txt').read_text(encoding='utf-8').strip() == 'buggy':",
    "    print('AssertionError: expected fixed but got buggy', file=sys.stderr)",
    "    raise SystemExit(1)",
  ].join("\n"),
);
await writeFile(join(root, "suite.py"), "raise SystemExit(0)\n");
await writeFile(
  join(root, ".patchproof.yml"),
  [
    "version: 1",
    "adapter: python",
    "execution:",
    '  setup: [python, "-m", pip, "--version"]',
    '  targetedTest: [python, run_test.py, "{test_file}"]',
    "  suite: [python, suite.py]",
    "  timeoutSeconds: 30",
    "  suiteTimeoutSeconds: 60",
    "tests:",
    '  include: ["tests/**/test_*.py"]',
  ].join("\n"),
);
await exec("git", ["add", "."], { cwd: root });
await exec("git", ["commit", "-m", "base"], { cwd: root });
const base = (
  await exec("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" })
).stdout.trim();
await writeFile(join(root, "implementation.txt"), "fixed\n");
await writeFile(
  join(root, "tests", "test_regression.py"),
  "def test_fixed_behavior():\n    assert True\n",
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
  {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
    env: {
      ...process.env,
      PATH: [shims, process.env.PATH ?? ""].filter(Boolean).join(delimiter),
    },
  },
);
const report = JSON.parse(stdout);
if (
  report.aggregate !== "proven" ||
  report.suite?.status !== "healthy" ||
  report.tests?.[0]?.status !== "proven"
) {
  throw new Error(`Python acceptance proof failed.\n${stdout}\n${stderr}`);
}
console.log(`Packaged Python acceptance passed in ${root}`);
