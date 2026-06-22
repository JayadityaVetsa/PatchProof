import { execFile } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import process from "node:process";
import { basename, delimiter, join, relative, resolve } from "node:path";
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

export interface PythonInvocation {
  readonly executable: string;
  readonly argsPrefix: readonly string[];
  readonly display: string;
}

const PYTHON_PROBE = [
  "import json,sys,venv",
  "print(json.dumps({'executable':sys.executable,'base_executable':getattr(sys,'_base_executable',sys.executable),'base_prefix':sys.base_prefix,'prefix':sys.prefix}))",
].join(";");

function invocation(executable: string, argsPrefix: readonly string[] = []): PythonInvocation {
  return {
    executable,
    argsPrefix,
    display: [executable, ...argsPrefix].join(" "),
  };
}

async function probePython(candidate: PythonInvocation): Promise<PythonInvocation | null> {
  try {
    const { stdout } = await execFileAsync(
      candidate.executable,
      [...candidate.argsPrefix, "-c", PYTHON_PROBE],
      {
        encoding: "utf8",
        windowsHide: true,
        timeout: 10_000,
      },
    );
    const details = JSON.parse(stdout.trim()) as {
      executable?: string;
      base_executable?: string;
      prefix?: string;
      base_prefix?: string;
    };
    if (!details.executable) return null;
    if (details.prefix !== details.base_prefix) {
      if (
        details.base_executable &&
        resolve(details.base_executable) !== resolve(details.executable)
      ) {
        return await probePython(invocation(details.base_executable));
      }
      return null;
    }
    return invocation(resolve(details.executable));
  } catch {
    return null;
  }
}

async function windowsPythonCandidates(): Promise<PythonInvocation[]> {
  if (process.platform !== "win32") return [];
  const candidates: PythonInvocation[] = [];
  const localPrograms = process.env.LOCALAPPDATA
    ? join(process.env.LOCALAPPDATA, "Programs", "Python")
    : null;
  if (localPrograms) {
    try {
      const directories = (await readdir(localPrograms, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory() && /^Python\d+$/i.test(entry.name))
        .sort((left, right) => right.name.localeCompare(left.name, undefined, { numeric: true }));
      for (const directory of directories) {
        candidates.push(invocation(join(localPrograms, directory.name, "python.exe")));
      }
    } catch {
      // The standard per-user Python installation directory is optional.
    }
  }
  return candidates;
}

async function uvPythonCandidate(): Promise<PythonInvocation | null> {
  for (const executable of [
    "uv",
    process.env.USERPROFILE && join(process.env.USERPROFILE, ".local", "bin", "uv.exe"),
  ].filter((value): value is string => Boolean(value))) {
    try {
      const { stdout } = await execFileAsync(executable, ["python", "find", "--system"], {
        encoding: "utf8",
        windowsHide: true,
        timeout: 10_000,
      });
      const path = stdout.trim().split(/\r?\n/).at(-1);
      if (path) return invocation(path);
    } catch {
      // uv is optional and this command never downloads an interpreter.
    }
  }
  return null;
}

let cachedPython: Promise<PythonInvocation> | undefined;

export async function pythonExecutable(): Promise<PythonInvocation> {
  cachedPython ??= (async () => {
    const configured = process.env.PATCHPROOF_PYTHON;
    const environmentRoots = [
      process.env.pythonLocation,
      process.env.Python_ROOT_DIR,
      process.env.Python3_ROOT_DIR,
    ].filter((value): value is string => Boolean(value));
    const candidates: PythonInvocation[] = [
      ...(configured ? [invocation(configured)] : []),
      ...environmentRoots.map((root) =>
        invocation(
          process.platform === "win32" ? join(root, "python.exe") : join(root, "bin", "python3"),
        ),
      ),
      ...(await windowsPythonCandidates()),
      ...(process.platform === "win32" ? [invocation("py", ["-3"])] : []),
      invocation("python3"),
      invocation("python"),
      ...(process.platform !== "win32"
        ? [invocation("/usr/bin/python3"), invocation("/opt/homebrew/bin/python3")]
        : []),
    ];
    const seen = new Set<string>();
    for (const candidate of candidates) {
      const key = `${candidate.executable}\0${candidate.argsPrefix.join("\0")}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const usable = await probePython(candidate);
      if (usable) return usable;
    }
    const uvCandidate = await uvPythonCandidate();
    if (uvCandidate) {
      const usable = await probePython(uvCandidate);
      if (usable) return usable;
    }
    throw new Error(
      "No usable system Python was found. Install Python 3 with venv support or set PATCHPROOF_PYTHON to its executable. Active/private virtual environments are not used to create proof environments.",
    );
  })().catch((error: unknown) => {
    cachedPython = undefined;
    throw error;
  });
  return cachedPython;
}

async function parseTests(
  file: string,
  selectedPython: Promise<PythonInvocation>,
): Promise<Array<{ name: string; line: number; endLine: number }>> {
  try {
    const executable = await selectedPython;
    const script = [
      "import ast,json,sys",
      "tree=ast.parse(open(sys.argv[1],encoding='utf-8').read())",
      "out=[]",
      "def walk(body,prefix=[]):",
      "  for n in body:",
      "    if isinstance(n,(ast.FunctionDef,ast.AsyncFunctionDef)) and n.name.startswith('test_'): out.append({'name':'::'.join(prefix+[n.name]),'line':min([n.lineno]+[d.lineno for d in n.decorator_list]),'endLine':getattr(n,'end_lineno',n.lineno)})",
      "    elif isinstance(n,ast.ClassDef) and n.name.startswith('Test'): walk(n.body,prefix+[n.name])",
      "walk(tree.body)",
      "print(json.dumps(out))",
    ].join("\n");
    const { stdout } = await execFileAsync(
      executable.executable,
      [...executable.argsPrefix, "-c", script, file],
      {
        encoding: "utf8",
        windowsHide: true,
      },
    );
    return JSON.parse(stdout);
  } catch {
    const source = await readFile(file, "utf8");
    const found: Array<{ name: string; line: number; endLine: number }> = [];
    let currentClass: { name: string; indent: number } | null = null;
    const lines = source.split(/\r?\n/);
    let decoratorStart: number | null = null;
    lines.forEach((line, index) => {
      const indent = line.match(/^\s*/)?.[0].replaceAll("\t", "    ").length ?? 0;
      const classMatch = /^\s*class\s+(Test\w*)\b/.exec(line);
      if (classMatch?.[1]) currentClass = { name: classMatch[1], indent };
      else if (currentClass && line.trim() && indent <= currentClass.indent) currentClass = null;
      const functionMatch = /^\s*(?:async\s+)?def\s+(test_\w*)\s*\(/.exec(line);
      if (functionMatch?.[1]) {
        let endLine = index + 1;
        for (let next = index + 1; next < lines.length; next += 1) {
          const candidate = lines[next] ?? "";
          if (!candidate.trim()) continue;
          const candidateIndent = candidate.match(/^\s*/)?.[0].replaceAll("\t", "    ").length ?? 0;
          if (candidateIndent <= indent) break;
          endLine = next + 1;
        }
        found.push({
          name: currentClass ? `${currentClass.name}::${functionMatch[1]}` : functionMatch[1],
          line: decoratorStart ?? index + 1,
          endLine,
        });
        decoratorStart = null;
      } else if (/^\s*@/.test(line)) {
        decoratorStart ??= index + 1;
      } else if (line.trim() && !classMatch) {
        decoratorStart = null;
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

function venvEnvironment(worktree: string, projectRoot: string): Readonly<Record<string, string>> {
  const project = resolve(worktree, projectRoot);
  const root = resolve(project, ".patchproof-venv");
  const scripts = process.platform === "win32" ? join(root, "Scripts") : join(root, "bin");
  const temporary = resolve(project, ".patchproof-tmp");
  return {
    VIRTUAL_ENV: root,
    PATH: [scripts, process.env.PATH ?? ""].filter(Boolean).join(delimiter),
    TEMP: temporary,
    TMP: temporary,
    TMPDIR: temporary,
  };
}

function withVenv(command: CommandSpec, context: WorktreeContext): CommandSpec {
  const rewritten = rewriteForVenv(command, context);
  return {
    ...rewritten,
    env: {
      ...rewritten.env,
      ...venvEnvironment(context.worktreeRoot, context.projectRoot),
    },
  };
}

function rewriteForVenv(command: CommandSpec, context: WorktreeContext): CommandSpec {
  if (!command.executable) return command;
  const name = basename(command.executable)
    .toLowerCase()
    .replace(/\.exe$/, "");
  const python = pythonInVenv(context.worktreeRoot, context.projectRoot);
  if (/^python(?:\d+(?:\.\d+)?)?$/.test(name) || name === "py") {
    const args = [...(command.args ?? [])];
    if (name === "py" && /^-\d+(?:\.\d+)?$/.test(args[0] ?? "")) args.shift();
    return { ...command, executable: python, args };
  }
  if (/^pip(?:\d+(?:\.\d+)?)?$/.test(name)) {
    return { ...command, executable: python, args: ["-m", "pip", ...(command.args ?? [])] };
  }
  if (name === "pytest" || name === "py.test") {
    return { ...command, executable: python, args: ["-m", "pytest", ...(command.args ?? [])] };
  }
  return command;
}

const SETUP_SCRIPT = [
  "import json,os,subprocess,sys,venv",
  "root,mode,payload,cwd=sys.argv[1:5]",
  "venv.EnvBuilder(with_pip=True,clear=True).create(root)",
  "scripts=os.path.join(root,'Scripts' if os.name=='nt' else 'bin')",
  "temporary=os.path.join(cwd,'.patchproof-tmp')",
  "os.makedirs(temporary,exist_ok=True)",
  "env=os.environ.copy()",
  "env['VIRTUAL_ENV']=root",
  "env['PATH']=scripts+os.pathsep+env.get('PATH','')",
  "env['TEMP']=temporary",
  "env['TMP']=temporary",
  "env['TMPDIR']=temporary",
  "command=payload if mode=='shell' else json.loads(payload)",
  "raise SystemExit(subprocess.run(command,cwd=cwd,env=env,shell=(mode=='shell')).returncode)",
].join(";");

function setupPayload(
  command: CommandSpec,
  context: WorktreeContext,
): { mode: "shell" | "argv"; payload: string } {
  if (command.shell !== undefined) return { mode: "shell", payload: command.shell };
  const rewritten = rewriteForVenv(command, context);
  if (!rewritten.executable) throw new Error("Python setup command has no executable.");
  return {
    mode: "argv",
    payload: JSON.stringify([rewritten.executable, ...(rewritten.args ?? [])]),
  };
}

export class PythonAdapter implements PatchProofAdapter {
  readonly name = "python" as const;

  constructor(private readonly bootstrapPython?: PythonInvocation) {}

  private systemPython(): Promise<PythonInvocation> {
    return this.bootstrapPython ? Promise.resolve(this.bootstrapPython) : pythonExecutable();
  }

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
          changedRanges: entry.changedRanges,
          selectionReason: "The test file was deleted and cannot be evaluated.",
          diagnostics: [],
        });
        continue;
      }
      try {
        const cases = (
          await parseTests(resolve(context.repositoryRoot, entry.path), this.systemPython())
        ).filter(
          (item) =>
            entry.status === "added" ||
            entry.addedLines.some((line) => line >= item.line && line <= item.endLine),
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
            sourceRange: { startLine: item.line, endLine: item.endLine },
            changedRanges: entry.changedRanges,
            selectionReason:
              entry.status === "added"
                ? "The test was added in the head revision."
                : "Changed lines overlap the test's source span.",
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
          changedRanges: entry.changedRanges,
          selectionReason: "The changed test file could not be targeted reliably by case.",
          fallbackReason: String(error),
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
    const systemPython = await this.systemPython();
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
    const configured = context.configuration.setup
      ? commandFromTemplate(context.configuration.setup, { worktree: context.worktreeRoot })
      : commandFromTemplate(
          [
            pythonInVenv(context.worktreeRoot, context.projectRoot),
            "-m",
            "pip",
            "install",
            "-e",
            editableTarget,
          ],
          {},
        );
    const payload = setupPayload(configured, context);
    return {
      executable: systemPython.executable,
      args: [
        ...systemPython.argsPrefix,
        "-c",
        SETUP_SCRIPT,
        venv,
        payload.mode,
        payload.payload,
        project,
      ],
      display: `create isolated Python environment with ${systemPython.display}; then ${configured.display}`,
    };
  }

  async targetedTestPlan(test: DiscoveredTest, context: WorktreeContext): Promise<CommandSpec> {
    if (context.configuration.targetedTest) {
      return withVenv(
        commandFromTemplate(context.configuration.targetedTest, {
          test_id: test.id,
          test_file: test.file,
          worktree: context.worktreeRoot,
        }),
        context,
      );
    }
    const projectFile =
      context.projectRoot === "." ? test.file : test.file.slice(context.projectRoot.length + 1);
    const nodeId =
      test.granularity === "case"
        ? `${projectFile}::${test.displayName.replaceAll(" > ", "::")}`
        : projectFile;
    return withVenv(
      commandFromTemplate(
        [pythonInVenv(context.worktreeRoot, context.projectRoot), "-m", "pytest", "-q", nodeId],
        {},
      ),
      context,
    );
  }

  async suitePlan(context: WorktreeContext): Promise<CommandSpec> {
    if (context.configuration.suite) {
      return withVenv(
        commandFromTemplate(context.configuration.suite, { worktree: context.worktreeRoot }),
        context,
      );
    }
    return withVenv(
      commandFromTemplate(
        [pythonInVenv(context.worktreeRoot, context.projectRoot), "-m", "pytest", "-q"],
        {},
      ),
      context,
    );
  }

  normalize(result: RawProcessResult): NormalizedOutcome {
    return normalizePytest(result);
  }
}
