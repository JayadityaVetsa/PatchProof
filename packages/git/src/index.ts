import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";
import type { RepositoryDiff, RepositoryDiffEntry } from "@patchproof/adapter-api";
import { minimatch } from "minimatch";

const execFileAsync = promisify(execFile);

async function git(root: string, args: readonly string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", ["-C", root, ...args], {
    encoding: "utf8",
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  });
  return stdout.trim();
}

export async function findRepositoryRoot(cwd: string): Promise<string> {
  return resolve(await git(cwd, ["rev-parse", "--show-toplevel"]));
}

export async function resolveRevision(root: string, ref: string): Promise<string> {
  try {
    return await git(root, ["rev-parse", "--verify", `${ref}^{commit}`]);
  } catch {
    throw new Error(`Git revision '${ref}' is unavailable. Fetch full history and retry.`);
  }
}

export async function mergeBase(root: string, head = "HEAD"): Promise<string> {
  const candidates = ["origin/main", "main", "origin/master", "master"];
  for (const candidate of candidates) {
    try {
      return await git(root, ["merge-base", candidate, head]);
    } catch {
      // Try the next conventional default branch.
    }
  }
  throw new Error("Unable to infer a base revision. Pass --base explicitly.");
}

export async function isAncestor(root: string, base: string, head: string): Promise<boolean> {
  try {
    await git(root, ["merge-base", "--is-ancestor", base, head]);
    return true;
  } catch {
    return false;
  }
}

export async function isDirty(root: string): Promise<boolean> {
  return (await git(root, ["status", "--porcelain=v1", "--untracked-files=normal"])) !== "";
}

function parseAddedLines(patch: string): Map<string, number[]> {
  const result = new Map<string, number[]>();
  let file = "";
  let nextLine = 0;
  for (const line of patch.split(/\r?\n/)) {
    if (line.startsWith("+++ b/")) {
      file = line.slice(6);
      if (!result.has(file)) result.set(file, []);
    } else if (line.startsWith("@@")) {
      const match = /\+(\d+)(?:,(\d+))?/.exec(line);
      nextLine = match ? Number(match[1]) : 0;
    } else if (file && line.startsWith("+") && !line.startsWith("+++")) {
      result.get(file)?.push(nextLine);
      nextLine += 1;
    } else if (file && !line.startsWith("-")) {
      nextLine += 1;
    }
  }
  return result;
}

export async function computeDiff(
  root: string,
  baseSha: string,
  headSha: string,
): Promise<RepositoryDiff> {
  const names = await git(root, [
    "diff",
    "--find-renames",
    "--name-status",
    "--no-ext-diff",
    baseSha,
    headSha,
    "--",
  ]);
  const patch = await git(root, ["diff", "--unified=0", "--no-ext-diff", baseSha, headSha, "--"]);
  const lines = parseAddedLines(patch);
  const entries: RepositoryDiffEntry[] = [];
  for (const row of names.split(/\r?\n/).filter(Boolean)) {
    const [rawStatus, first, second] = row.split("\t");
    if (!rawStatus || !first) continue;
    const kind = rawStatus[0];
    if (kind === "R" && second) {
      entries.push({
        status: "renamed",
        oldPath: first,
        path: second,
        addedLines: lines.get(second) ?? [],
      });
    } else {
      entries.push({
        status: kind === "A" ? "added" : kind === "D" ? "deleted" : "modified",
        path: first,
        addedLines: lines.get(first) ?? [],
      });
    }
  }
  return { baseSha, headSha, entries };
}

function safeRepositoryPath(path: string): string {
  const normalized = path.replaceAll("\\", "/");
  if (
    isAbsolute(path) ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw new Error(`Unsafe repository path: ${path}`);
  }
  return normalized;
}

export interface ManagedWorktrees {
  readonly root: string;
  readonly base: string;
  readonly head: string;
  cleanup(): Promise<readonly string[]>;
}

export async function createWorktrees(
  repositoryRoot: string,
  baseSha: string,
  headSha: string,
): Promise<ManagedWorktrees> {
  const root = await mkdtemp(join(tmpdir(), "patchproof-"));
  const base = join(root, "base");
  const head = join(root, "head");
  const journal = join(root, "cleanup.json");
  await writeFile(journal, JSON.stringify({ repositoryRoot, paths: [base, head] }), "utf8");
  const created: string[] = [];
  try {
    await git(repositoryRoot, ["worktree", "add", "--detach", base, baseSha]);
    created.push(base);
    await git(repositoryRoot, ["worktree", "add", "--detach", head, headSha]);
    created.push(head);
  } catch (error) {
    for (const path of created.reverse()) {
      try {
        await git(repositoryRoot, ["worktree", "remove", "--force", path]);
      } catch {
        // Cleanup continues below.
      }
    }
    await rm(root, { recursive: true, force: true });
    throw error;
  }
  return {
    root,
    base,
    head,
    async cleanup() {
      const failures: string[] = [];
      for (const path of [base, head]) {
        try {
          await git(repositoryRoot, ["worktree", "remove", "--force", path]);
        } catch (error) {
          failures.push(`${path}: ${String(error)}`);
        }
      }
      if (!failures.length) await rm(root, { recursive: true, force: true });
      return failures;
    },
  };
}

export async function transplantFiles(
  repositoryRoot: string,
  headSha: string,
  baseWorktree: string,
  paths: readonly string[],
  allowedPatterns: readonly string[],
): Promise<void> {
  for (const input of paths) {
    const path = safeRepositoryPath(input);
    if (!allowedPatterns.some((pattern) => minimatch(path, pattern, { dot: true }))) {
      throw new Error(`Refusing to transplant non-test path '${path}'.`);
    }
    let content: Buffer;
    try {
      const { stdout } = await execFileAsync(
        "git",
        ["-C", repositoryRoot, "show", `${headSha}:${path}`],
        {
          encoding: "buffer",
          windowsHide: true,
          maxBuffer: 20 * 1024 * 1024,
        },
      );
      content = stdout;
    } catch {
      throw new Error(`Unable to read '${path}' from head revision.`);
    }
    const target = resolve(baseWorktree, ...path.split("/"));
    const rel = relative(resolve(baseWorktree), target);
    if (rel.startsWith(`..${sep}`) || rel === "..")
      throw new Error(`Path escapes worktree: ${path}`);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content);
  }
}

export async function readAtRevision(
  root: string,
  revision: string,
  path: string,
): Promise<string> {
  return await git(root, ["show", `${revision}:${safeRepositoryPath(path)}`]);
}
