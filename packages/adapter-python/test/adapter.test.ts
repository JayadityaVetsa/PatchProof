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
    const adapter = new PythonAdapter({
      executable: process.execPath,
      argsPrefix: [],
      display: process.execPath,
    });
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
    const adapter = new PythonAdapter({
      executable: process.execPath,
      argsPrefix: [],
      display: process.execPath,
    });
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

  it("runs explicit Python commands inside an isolated worktree environment", async () => {
    const root = await mkdtemp(join(tmpdir(), "patchproof-python environment with spaces-"));
    await writeFile(join(root, "pyproject.toml"), "[project]\nname='fixture'\nversion='0.0.0'\n");
    const adapter = new PythonAdapter({
      executable: process.execPath,
      argsPrefix: [],
      display: process.execPath,
    });
    const context = {
      repositoryRoot: root,
      worktreeRoot: root,
      projectRoot: ".",
      role: "head" as const,
      configuration: {
        setup: ["python", "-m", "pip", "install", "-e", ".[dev]"],
        targetedTest: ["python", "-m", "pytest", "-q", "{test_id}"],
        suite: ["python", "-m", "pytest", "-q"],
        include: [],
        exclude: [],
        support: [],
      },
    };

    const setup = await adapter.setupPlan(context);
    expect(setup?.display).toContain("create isolated Python environment");
    expect(setup?.display).toContain("python -m pip install -e .[dev]");
    const setupMode = setup?.args?.indexOf("argv") ?? -1;
    const setupCommand = JSON.parse(setup?.args?.[setupMode + 1] ?? "[]") as string[];
    expect(setupCommand[0]).toBe(
      join(
        root,
        ".patchproof-venv",
        process.platform === "win32" ? "Scripts" : "bin",
        process.platform === "win32" ? "python.exe" : "python",
      ),
    );

    const targeted = await adapter.targetedTestPlan(
      {
        id: "tests/test_value.py::test_value",
        file: "tests/test_value.py",
        displayName: "test_value",
        changeKind: "added",
        granularity: "case",
        changedRanges: [{ startLine: 1, endLine: 2 }],
        selectionReason: "added",
        diagnostics: [],
      },
      context,
    );
    expect(targeted.env?.VIRTUAL_ENV).toBe(join(root, ".patchproof-venv"));
    expect(targeted.env?.TEMP).toBe(join(root, ".patchproof-tmp"));
    expect(targeted.env?.TMP).toBe(join(root, ".patchproof-tmp"));
    expect(targeted.env?.TMPDIR).toBe(join(root, ".patchproof-tmp"));
    expect(targeted.env?.PATH?.split(process.platform === "win32" ? ";" : ":")[0]).toContain(
      ".patchproof-venv",
    );
    expect(targeted.executable).toBe(
      join(
        root,
        ".patchproof-venv",
        process.platform === "win32" ? "Scripts" : "bin",
        process.platform === "win32" ? "python.exe" : "python",
      ),
    );
    expect(targeted.display).toBe("python -m pytest -q tests/test_value.py::test_value");
  });
});
