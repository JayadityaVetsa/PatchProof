import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PythonAdapter } from "../src/index.js";

describe("Python adapter", () => {
  it("detects pytest projects and discovers a changed test function", async () => {
    const root = await mkdtemp(join(tmpdir(), "patchproof-python-"));
    await mkdir(join(root, "tests"));
    await writeFile(
      join(root, "pyproject.toml"),
      "[project]\nname='fixture'\nversion='0.0.0'\n[tool.pytest.ini_options]\ntestpaths=['tests']\n",
    );
    await writeFile(
      join(root, "tests", "test_value.py"),
      "def test_boundary():\n    assert 1 == 2\n",
    );
    const adapter = new PythonAdapter();
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
        entries: [
          {
            status: "added",
            path: "tests/test_value.py",
            addedLines: [1, 2],
            changedRanges: [{ startLine: 1, endLine: 2 }],
          },
        ],
      },
    );
    expect(tests[0]).toMatchObject({
      displayName: "test_boundary",
      granularity: "case",
      sourceRange: { startLine: 1, endLine: 2 },
    });
  });

  it("selects parametrized tests when a changed line is inside the body", async () => {
    const root = await mkdtemp(join(tmpdir(), "patchproof-python-spans-"));
    await mkdir(join(root, "tests"));
    await writeFile(
      join(root, "pyproject.toml"),
      "[tool.pytest.ini_options]\ntestpaths=['tests']\n",
    );
    await writeFile(
      join(root, "tests", "test_value.py"),
      [
        "import pytest",
        "",
        "@pytest.mark.parametrize('value', [1, 2])",
        "def test_boundary(value):",
        "    observed = value + 1",
        "    assert observed > value",
      ].join("\n"),
    );
    const tests = await new PythonAdapter().discoverTests(
      {
        repositoryRoot: root,
        projectRoot: ".",
        configuration: { include: [], exclude: [], support: [] },
      },
      {
        baseSha: "base",
        headSha: "head",
        entries: [
          {
            status: "modified",
            path: "tests/test_value.py",
            addedLines: [5],
            changedRanges: [{ startLine: 5, endLine: 5 }],
          },
        ],
      },
    );
    expect(tests[0]).toMatchObject({
      displayName: "test_boundary",
      granularity: "case",
      sourceRange: { startLine: 3, endLine: 6 },
    });
  });

  it("only accepts pytest assertion exits as assertion failure", () => {
    const adapter = new PythonAdapter();
    expect(
      adapter.normalize(
        {
          exitCode: 1,
          signal: null,
          stdout: "===== FAILURES =====\nAssertionError",
          stderr: "",
          timedOut: false,
          interrupted: false,
        },
        "test",
      ),
    ).toBe("assertion_failure");
    expect(
      adapter.normalize(
        {
          exitCode: 2,
          signal: null,
          stdout: "",
          stderr: "ImportError",
          timedOut: false,
          interrupted: false,
        },
        "test",
      ),
    ).toBe("infrastructure_failure");
  });
});
