import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { JavaScriptAdapter } from "../src/index.js";

describe("JavaScript adapter", () => {
  it("detects Vitest and discovers a changed case", async () => {
    const root = await mkdtemp(join(tmpdir(), "patchproof-js-"));
    await mkdir(join(root, "tests"));
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({ devDependencies: { vitest: "^3.0.0" } }),
    );
    await writeFile(
      join(root, "tests", "value.test.ts"),
      "import { test, expect } from 'vitest';\ntest('boundary', () => expect(1).toBe(2));\n",
    );
    const adapter = new JavaScriptAdapter();
    expect((await adapter.detect(root)).confidence).toBe("high");
    const tests = await adapter.discoverTests(
      {
        repositoryRoot: root,
        projectRoot: ".",
        configuration: { include: [], exclude: [], support: [] },
      },
      {
        baseSha: "base",
        headSha: "head",
        entries: [{ status: "added", path: "tests/value.test.ts", addedLines: [1, 2] }],
      },
    );
    expect(tests[0]).toMatchObject({ displayName: "boundary", granularity: "case" });
  });

  it("treats module errors as infrastructure failures", () => {
    const adapter = new JavaScriptAdapter();
    expect(
      adapter.normalize(
        {
          exitCode: 1,
          signal: null,
          stdout: "",
          stderr: "Error: Cannot find module 'missing'",
          timedOut: false,
          interrupted: false,
        },
        "test",
      ),
    ).toBe("infrastructure_failure");
  });
});
