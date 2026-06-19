import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import type {
  AdapterContext,
  CommandSpec,
  DetectionResult,
  Diagnostic,
  DiscoveredTest,
  NormalizedOutcome,
  PatchProofAdapter,
  RawProcessResult,
  RepositoryDiff,
  WorktreeContext,
} from "@patchproof/adapter-api";
import { commandFromTemplate } from "@patchproof/adapter-api";
import { minimatch } from "minimatch";

const execFileAsync = promisify(execFile);
const TEST_DEFAULTS = ["**/test_*.py", "**/*_test.py"];
const MARKERS = ["pyproject.toml", "pytest.ini", "setup.cfg", "setup.py"];
const SKIP_DIRECTORIES = new Set([".git", ".venv", "venv", "__pycache__", "dist", "build"]);

async function findProjects(root: string, depth = 0): Promise<string[]> {
  if (depth > 4) return [];
  const result: string[] = [];
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return result;
  }
  if (entries.some((entry) => entry.isFile() && MARKERS.includes(entry.name))) result.push(root);
  for (const entry of entries) {
    if (entry.isDirectory() && !SKIP_DIRECTORIES.has(entry.name)) {
      result.push(...(await findProjects(join(root, entry.name), depth + 1)));
    }
  }
  return result;
}

function matchesTest(path: string, context: AdapterContext): boolean {
  const includes = context.configuration.include.length
    ? context.configuration.include
    : TEST_DEFAULTS;
  return (
    includes.some((pattern) => minimatch(path, pattern, { dot: true })) &&
    !context.configuration.exclude.some((pattern) => minimatch(path, pattern, { dot: true }))
  );
}

async function pythonExecutable(): Promise<string> {
  for (const executable of process.platform === "win32"
    ? ["python", "py"]
    : ["python3", "python"]) {
    try {
      await execFileAsync(executable, ["--version"], { windowsHide: true });
      return executable;
    } catch {
      // Try the next executable.
    }
  }
  return "python";
}

async function parseTests(file: string): Promise<Array<{ name: string; line: number }>> {
  try {
    const executable = await pythonExecutable();
    const script = [
      "import ast,json,sys",
      "tree=ast.parse(open(sys.argv[1],encoding='utf-8').read())",
      "out=[]",
      "def walk(body,prefix=[]):",
      "  for n in body:",
      "    if isinstance(n,(ast.FunctionDef,ast.AsyncFunctionDef)) and n.name.startswith('test_'): out.append({'name':'::'.join(prefix+[n.name]),'line':n.lineno})",
      "    elif isinstance(n,ast.ClassDef) and n.name.startswith('Test'): walk(n.body,prefix+[n.name])",
      "walk(tree.body)",
      "print(json.dumps(out))",
    ].join("\n");
    const args = executable === "py" ? ["-3", "-c", script, file] : ["-c", script, file];
    const { stdout } = await execFileAsync(executable, args, {
      encoding: "utf8",
      windowsHide: true,
    });
    return JSON.parse(stdout);
  } catch {
    const source = await readFile(file, "utf8");
    const found: Array<{ name: string; line: number }> = [];
    let currentClass: { name: string; indent: number } | null = null;
    source.split(/\r?\n/).forEach((line, index) => {
      const indent = line.match(/^\s*/)?.[0].replaceAll("\t", "    ").length ?? 0;
      const classMatch = /^\s*class\s+(Test\w*)\b/.exec(line);
      if (classMatch?.[1]) currentClass = { name: classMatch[1], indent };
      else if (currentClass && line.trim() && indent <= currentClass.indent) currentClass = null;
      const functionMatch = /^\s*(?:async\s+)?def\s+(test_\w*)\s*\(/.exec(line);
      if (functionMatch?.[1]) {
        found.push({
          name: currentClass ? `${currentClass.name}::${functionMatch[1]}` : functionMatch[1],
          line: index + 1,
        });
      }
    });
    return found;
  }
}

function normalizePytest(result: RawProcessResult): NormalizedOutcome {
  if (result.interrupted) return "interrupted";
  if (result.timedOut) return "timeout";
  if (result.exitCode === 0) return "pass";
  const output = `${result.stdout}\n${result.stderr}`;
  if (
    result.exitCode === 1 &&
    (/=+ FAILURES =+/.test(output) ||
      /\bAssertionError\b/.test(output) ||
      /\bassert .+/.test(output))
  ) {
    return "assertion_failure";
  }
  return "infrastructure_failure";
}

function pythonInVenv(worktree: string, projectRoot: string): string {
  const root = resolve(worktree, projectRoot, ".patchproof-venv");
  return process.platform === "win32"
    ? join(root, "Scripts", "python.exe")
    : join(root, "bin", "python");
}

export class PythonAdapter implements PatchProofAdapter {
  readonly name = "python" as const;

  async detect(repositoryRoot: string): Promise<DetectionResult> {
    const roots = await findProjects(repositoryRoot);
    const normalized = roots.map(
      (root) => relative(repositoryRoot, root).replaceAll("\\", "/") || ".",
    );
    return {
      adapter: this.name,
      confidence: roots.length ? "high" : "none",
      projectRoots: normalized,
      evidence: normalized.map((root) => `${root} (Python project marker)`),
    };
  }

  async validate(context: AdapterContext): Promise<readonly Diagnostic[]> {
    const root = resolve(context.repositoryRoot, context.projectRoot);
    const files = await readdir(root);
    return files.some((file) => MARKERS.includes(file)) || context.configuration.targetedTest
      ? []
      : [
          {
            code: "PP_ADAPTER_UNSUPPORTED_PROJECT",
            severity: "error",
            summary: "No supported Python project marker was found.",
          },
        ];
  }

  async discoverTests(
    context: AdapterContext,
    diff: RepositoryDiff,
  ): Promise<readonly DiscoveredTest[]> {
    const tests: DiscoveredTest[] = [];
    for (const entry of diff.entries) {
      const projectPath =
        context.projectRoot === "."
          ? entry.path
          : entry.path.startsWith(`${context.projectRoot}/`)
            ? entry.path.slice(context.projectRoot.length + 1)
            : "";
      if (!projectPath || !matchesTest(projectPath, context)) continue;
      if (entry.status === "deleted") {
        tests.push({
          id: projectPath,
          file: entry.path,
          displayName: projectPath,
          changeKind: "deleted",
          granularity: "file",
          diagnostics: [],
        });
        continue;
      }
      try {
        const cases = (await parseTests(resolve(context.repositoryRoot, entry.path))).filter(
          (item) => entry.status === "added" || entry.addedLines.includes(item.line),
        );
        if (!cases.length) throw new Error("No statically changed pytest case found.");
        tests.push(
          ...cases.map((item) => ({
            id: `${projectPath}::${item.name}`,
            file: entry.path,
            displayName: item.name,
            changeKind: entry.status === "added" ? ("added" as const) : ("modified" as const),
            granularity: "case" as const,
            line: item.line,
            diagnostics: [],
          })),
        );
      } catch (error) {
        tests.push({
          id: projectPath,
          file: entry.path,
          displayName: projectPath,
          changeKind: entry.status === "added" ? "added" : "modified",
          granularity: "file",
          diagnostics: [
            {
              code: "PP_DISCOVERY_FILE_FALLBACK",
              severity: "warning",
              summary: "Dynamic or ambiguous pytest syntax required file-level targeting.",
              detail: String(error),
            },
          ],
        });
      }
    }
    return tests;
  }

  async supportFiles(context: AdapterContext, diff: RepositoryDiff): Promise<readonly string[]> {
    return diff.entries
      .filter(
        (entry) =>
          entry.status !== "deleted" &&
          context.configuration.support.some((pattern) =>
            minimatch(entry.path, pattern, { dot: true }),
          ),
      )
      .map((entry) => entry.path);
  }

  async setupPlan(context: WorktreeContext): Promise<CommandSpec | null> {
    if (context.configuration.setup) {
      return commandFromTemplate(context.configuration.setup, { worktree: context.worktreeRoot });
    }
    const systemPython = await pythonExecutable();
    const project = resolve(context.worktreeRoot, context.projectRoot);
    const venv = resolve(project, ".patchproof-venv");
    let editableTarget = ".";
    try {
      const pyproject = await readFile(resolve(project, "pyproject.toml"), "utf8");
      if (
        /\[project\.optional-dependencies\][\s\S]*?(?:^|\n)test\s*=/m.test(pyproject) ||
        /\[project\.optional-dependencies\][\s\S]*?(?:^|\n)tests\s*=/m.test(pyproject)
      ) {
        editableTarget = ".[test]";
      }
    } catch {
      // setup.py/setup.cfg projects use a plain editable install.
    }
    const install =
      process.platform === "win32"
        ? `${systemPython} -m venv "${venv}" && "${pythonInVenv(context.worktreeRoot, context.projectRoot)}" -m pip install -e "${editableTarget}"`
        : `${systemPython} -m venv '${venv}' && '${pythonInVenv(context.worktreeRoot, context.projectRoot)}' -m pip install -e '${editableTarget}'`;
    return { shell: install, display: install };
  }

  async targetedTestPlan(test: DiscoveredTest, context: WorktreeContext): Promise<CommandSpec> {
    if (context.configuration.targetedTest) {
      return commandFromTemplate(context.configuration.targetedTest, {
        test_id: test.id,
        test_file: test.file,
        worktree: context.worktreeRoot,
      });
    }
    const projectFile =
      context.projectRoot === "." ? test.file : test.file.slice(context.projectRoot.length + 1);
    const nodeId =
      test.granularity === "case"
        ? `${projectFile}::${test.displayName.replaceAll(" > ", "::")}`
        : projectFile;
    return commandFromTemplate(
      [pythonInVenv(context.worktreeRoot, context.projectRoot), "-m", "pytest", "-q", nodeId],
      {},
    );
  }

  async suitePlan(context: WorktreeContext): Promise<CommandSpec> {
    if (context.configuration.suite) {
      return commandFromTemplate(context.configuration.suite, { worktree: context.worktreeRoot });
    }
    return commandFromTemplate(
      [pythonInVenv(context.worktreeRoot, context.projectRoot), "-m", "pytest", "-q"],
      {},
    );
  }

  normalize(result: RawProcessResult): NormalizedOutcome {
    return normalizePytest(result);
  }
}
