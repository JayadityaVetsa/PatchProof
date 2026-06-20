import { execFile } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { inspectRun, prepareRun, type PatchProofConfig } from "../src/index.js";

const exec = promisify(execFile);

async function commit(root: string, message: string): Promise<string> {
  await exec("git", ["add", "."], { cwd: root });
  await exec("git", ["commit", "-m", message], { cwd: root });
  return (await exec("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" })).stdout.trim();
}

describe("proof orchestration", () => {
  it("proves an added regression test against a real Git history", async () => {
    const root = await mkdtemp(join(tmpdir(), "patchproof-engine-"));
    await exec("git", ["init", "-b", "main"], { cwd: root });
    await exec("git", ["config", "user.email", "fixture@example.com"], { cwd: root });
    await exec("git", ["config", "user.name", "Fixture"], { cwd: root });
    await mkdir(join(root, "tests"));
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({ type: "module", devDependencies: { vitest: "^3.0.0" } }),
    );
    await mkdir(join(root, "examples", "nested"), { recursive: true });
    await writeFile(
      join(root, "examples", "nested", "package.json"),
      JSON.stringify({ devDependencies: { jest: "^30.0.0" } }),
    );
    await writeFile(join(root, "implementation.txt"), "buggy\n");
    await writeFile(
      join(root, "run-test.mjs"),
      "import{readFileSync,existsSync}from'node:fs';if(!existsSync(process.argv[2]))process.exit(2);if(readFileSync('implementation.txt','utf8').trim()==='buggy'){console.error('AssertionError: expected fixed but got buggy');process.exit(1)}\n",
    );
    await writeFile(join(root, "suite.mjs"), "process.exit(0)\n");
    const base = await commit(root, "base");
    await writeFile(join(root, "implementation.txt"), "fixed\n");
    await writeFile(
      join(root, "tests", "regression.test.js"),
      "import { test, expect } from 'vitest';\ntest('fixed behavior', () => expect(true).toBe(true));\n",
    );
    const head = await commit(root, "fix with regression test");
    const config: PatchProofConfig = {
      version: 1,
      base,
      head,
      adapter: "javascript",
      projectRoot: ".",
      execution: {
        approved: true,
        setup: [process.execPath, "-e", ""],
        targetedTest: [process.execPath, "run-test.mjs", "{test_file}"],
        suite: [process.execPath, "suite.mjs"],
        timeoutSeconds: 10,
        suiteTimeoutSeconds: 10,
        keepWorktrees: false,
      },
      tests: { include: ["**/*.test.js"], exclude: [], support: [] },
      report: { format: "json", output: null },
    };
    const prepared = await prepareRun({
      repositoryRoot: root,
      config,
      allowDirty: false,
      consent: "configuration",
    });
    const inspection = await inspectRun({
      repositoryRoot: root,
      config,
      allowDirty: false,
    });
    expect(inspection.tests[0]).toMatchObject({
      id: "tests/regression.test.js::fixed behavior",
      selectionReason: "The test was added in the head revision.",
    });
    expect(JSON.stringify(inspection)).not.toContain(root);
    const report = await prepared.execute();
    expect(report.aggregate).toBe("proven");
    expect(report.tests[0]).toMatchObject({
      status: "proven",
      base: { outcome: "assertion_failure" },
      head: { outcome: "pass" },
      selection: {
        reason: "The test was added in the head revision.",
      },
    });
    expect(JSON.stringify(report)).not.toContain(root);
    expect(report.suite.status).toBe("healthy");

    await expect(
      prepareRun({
        repositoryRoot: root,
        config: { ...config, base: head, head },
        allowDirty: false,
        consent: "configuration",
      }),
    ).rejects.toThrow("Base and head resolve to the same commit");
  }, 30_000);
});
