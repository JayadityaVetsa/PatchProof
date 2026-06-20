import { execFile } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { prepareRun, type PatchProofConfig } from "../src/index.js";

const exec = promisify(execFile);

async function commit(root: string, message: string): Promise<string> {
  await exec("git", ["add", "."], { cwd: root });
  await exec("git", ["commit", "-m", message], { cwd: root });
  return (await exec("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" })).stdout.trim();
}

async function scenario(
  baseMode: "pass" | "assertion" | "infrastructure",
  headMode: "pass" | "assertion" | "infrastructure",
  baseSuite: "pass" | "assertion" = "pass",
  headSuite: "pass" | "assertion" = "pass",
  addTest = true,
) {
  const root = await mkdtemp(join(tmpdir(), "patchproof-matrix-"));
  await exec("git", ["init", "-b", "main"], { cwd: root });
  await exec("git", ["config", "user.email", "fixture@example.com"], { cwd: root });
  await exec("git", ["config", "user.name", "Fixture"], { cwd: root });
  await mkdir(join(root, "tests"));
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ type: "module", devDependencies: { vitest: "^3.0.0" } }),
  );
  await writeFile(
    join(root, "target.mjs"),
    [
      "import{readFileSync}from'node:fs';",
      "const mode=readFileSync('mode.txt','utf8').trim();",
      "if(mode==='assertion'){console.error('AssertionError: expected pass');process.exit(1)}",
      "if(mode==='infrastructure'){console.error('Cannot find module missing');process.exit(2)}",
    ].join(""),
  );
  await writeFile(
    join(root, "suite.mjs"),
    "import{readFileSync}from'node:fs';if(readFileSync('suite.txt','utf8').trim()==='assertion'){console.error('AssertionError: suite');process.exit(1)}\n",
  );
  await writeFile(join(root, "mode.txt"), `${baseMode}\n`);
  await writeFile(join(root, "suite.txt"), `${baseSuite}\n`);
  const base = await commit(root, "base");
  await writeFile(join(root, "mode.txt"), `${headMode}\n`);
  await writeFile(join(root, "suite.txt"), `${headSuite}\n`);
  if (addTest) {
    await writeFile(
      join(root, "tests", "regression.test.js"),
      "import { test, expect } from 'vitest';\ntest('behavior', () => expect(true).toBe(true));\n",
    );
  } else {
    await writeFile(join(root, "README.md"), "No test change.\n");
  }
  const head = await commit(root, "head");
  const config: PatchProofConfig = {
    version: 1,
    base,
    head,
    adapter: "javascript",
    projectRoot: ".",
    execution: {
      approved: true,
      setup: [process.execPath, "-e", ""],
      targetedTest: [process.execPath, "target.mjs"],
      suite: [process.execPath, "suite.mjs"],
      timeoutSeconds: 10,
      suiteTimeoutSeconds: 10,
      keepWorktrees: false,
    },
    tests: { include: ["**/*.test.js"], exclude: [], support: [] },
    report: { format: "json", output: null },
  };
  return await (
    await prepareRun({
      repositoryRoot: root,
      config,
      allowDirty: false,
      consent: "configuration",
    })
  ).execute();
}

describe("end-to-end status matrix", () => {
  it.each([
    ["assertion", "pass", "proven"],
    ["pass", "pass", "not_proven"],
    ["assertion", "assertion", "still_failing"],
    ["infrastructure", "pass", "inconclusive"],
  ] as const)(
    "%s -> %s produces %s",
    async (base, head, expected) => {
      const report = await scenario(base, head);
      expect(report.tests[0]?.status).toBe(expected);
      expect(report.aggregate).toBe(expected);
    },
    30_000,
  );

  it("lets a newly failing head suite override per-test proof", async () => {
    const report = await scenario("assertion", "pass", "pass", "assertion");
    expect(report.tests[0]?.status).toBe("proven");
    expect(report.aggregate).toBe("regression");
  }, 30_000);

  it("reports no_tests without inventing evidence", async () => {
    const report = await scenario("pass", "pass", "pass", "pass", false);
    expect(report.tests).toEqual([]);
    expect(report.aggregate).toBe("no_tests");
  }, 30_000);
});
