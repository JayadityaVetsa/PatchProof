import { execFile } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";
import { computeDiff, createWorktrees, resolveRevision, transplantFiles } from "../src/index.js";

const exec = promisify(execFile);

async function fixtureRepository(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "patchproof-git-"));
  await exec("git", ["init", "-b", "main"], { cwd: root });
  await exec("git", ["config", "user.email", "fixture@example.com"], { cwd: root });
  await exec("git", ["config", "user.name", "Fixture"], { cwd: root });
  await writeFile(join(root, "test_sample.py"), "def test_one():\n    assert True\n");
  await exec("git", ["add", "."], { cwd: root });
  await exec("git", ["commit", "-m", "base"], { cwd: root });
  return root;
}

describe("Git isolation", () => {
  it("computes changed lines and cleans worktrees", async () => {
    const root = await fixtureRepository();
    const base = await resolveRevision(root, "HEAD");
    await writeFile(
      join(root, "test_sample.py"),
      "def test_one():\n    assert True\n\ndef test_two():\n    assert False\n",
    );
    await exec("git", ["add", "."], { cwd: root });
    await exec("git", ["commit", "-m", "head"], { cwd: root });
    const head = await resolveRevision(root, "HEAD");
    const diff = await computeDiff(root, base, head);
    expect(diff.entries[0]?.addedLines.length).toBeGreaterThan(0);
    expect(diff.entries[0]?.changedRanges).toEqual([{ startLine: 3, endLine: 5 }]);
    const worktrees = await createWorktrees(root, base, head);
    expect(await worktrees.cleanup()).toEqual([]);
  });

  it("rejects traversal and production-file transplants", async () => {
    const root = await fixtureRepository();
    const head = await resolveRevision(root, "HEAD");
    await expect(transplantFiles(root, head, root, ["../outside"], ["tests/**"])).rejects.toThrow(
      /Unsafe repository path/,
    );
    await expect(
      transplantFiles(root, head, root, ["test_sample.py"], ["tests/**"]),
    ).rejects.toThrow(/non-test path/);
  });
});
