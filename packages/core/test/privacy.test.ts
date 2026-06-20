import { describe, expect, it } from "vitest";
import type { PatchProofReport } from "@patchproof/adapter-api";
import { redactText, sanitizeReport } from "../src/index.js";

describe("privacy redaction", () => {
  it("redacts repository, worktree, home-like paths, and named secrets", () => {
    const repositoryRoot = "C:\\Users\\private-user\\Quant Projects\\repo";
    const worktreeRoot = "C:\\Users\\private-user\\AppData\\Local\\Temp\\patchproof-123";
    const value = [
      repositoryRoot,
      worktreeRoot,
      "authorization=very-secret-value",
      "::error::unsafe",
    ].join("\n");
    const redacted = redactText(value, { repositoryRoot, worktreeRoot });
    expect(redacted).toContain("<repository>");
    expect(redacted).toContain("<worktrees>");
    expect(redacted).toContain("authorization=[REDACTED]");
    expect(redacted).not.toContain("private-user");
    expect(redacted).not.toContain("very-secret-value");
  });

  it("sanitizes every report surface including debug evidence", () => {
    const root = "C:\\Users\\private-user\\repo";
    const report: PatchProofReport = {
      schemaVersion: 1,
      tool: { name: "patchproof", version: "0.1.0-alpha.1" },
      repository: {
        root: "<repository>",
        projectRoot: ".",
        baseSha: "a".repeat(40),
        headSha: "b".repeat(40),
        dirtyOverride: false,
      },
      execution: {
        adapter: "python",
        consent: "ci",
        startedAt: "2026-06-19T00:00:00.000Z",
        durationMs: 1,
      },
      tests: [
        {
          id: "tests/test_value.py::test_value",
          file: "tests/test_value.py",
          displayName: "test_value",
          granularity: "case",
          selection: {
            changedRanges: [{ startLine: 2, endLine: 2 }],
            sourceRange: { startLine: 1, endLine: 2 },
            reason: "changed body",
          },
          status: "inconclusive",
          base: {
            command: {
              executable: `${root}\\venv\\python.exe`,
              args: ["-m", "pytest", `token=super-secret`],
              display: `${root}\\venv\\python.exe token=super-secret`,
            },
            cwdRole: "base",
            startedAt: "2026-06-19T00:00:00.000Z",
            durationMs: 1,
            exitCode: 2,
            signal: null,
            outcome: "infrastructure_failure",
            stdout: root,
            stderr: "password=hunter2",
            truncated: false,
          },
          diagnostics: [
            {
              code: "PP_TEST",
              severity: "error",
              summary: `Failure in ${root}`,
              detail: "credential=abc123",
            },
          ],
        },
      ],
      suite: { status: "not_run", diagnostics: [] },
      aggregate: "inconclusive",
      diagnostics: [],
      limitations: [],
    };
    const serialized = JSON.stringify(sanitizeReport(report, { repositoryRoot: root }));
    expect(serialized).not.toContain("private-user");
    expect(serialized).not.toContain("super-secret");
    expect(serialized).not.toContain("hunter2");
    expect(serialized).not.toContain("abc123");
    expect(serialized).toContain("<repository>");
  });
});
