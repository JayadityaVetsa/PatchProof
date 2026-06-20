import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { parse } from "@babel/parser";
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

const TEST_DEFAULTS = ["**/*.test.{js,jsx,ts,tsx,mjs,cjs}", "**/*.spec.{js,jsx,ts,tsx,mjs,cjs}"];
const SKIP_DIRECTORIES = new Set([".git", "node_modules", "dist", "build", "coverage", ".next"]);

async function findManifests(root: string, depth = 0): Promise<string[]> {
  if (depth > 4) return [];
  const result: string[] = [];
  let entries;
  try {
    entries = await readdir(root, { withFileTypes: true });
  } catch {
    return result;
  }
  if (entries.some((entry) => entry.isFile() && entry.name === "package.json")) result.push(root);
  for (const entry of entries) {
    if (entry.isDirectory() && !SKIP_DIRECTORIES.has(entry.name)) {
      result.push(...(await findManifests(join(root, entry.name), depth + 1)));
    }
  }
  return result;
}

async function packageData(root: string): Promise<any> {
  return JSON.parse(await readFile(join(root, "package.json"), "utf8"));
}

function framework(data: any): "vitest" | "jest" | null {
  const dependencies = {
    ...(data.dependencies ?? {}),
    ...(data.devDependencies ?? {}),
    ...(data.peerDependencies ?? {}),
  };
  if (dependencies.vitest) return "vitest";
  if (dependencies.jest || dependencies["@jest/core"]) return "jest";
  const test = String(data.scripts?.test ?? "");
  if (/\bvitest\b/.test(test)) return "vitest";
  if (/\bjest\b/.test(test)) return "jest";
  return null;
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

function literalName(node: any): string | null {
  if (node?.type === "StringLiteral") return node.value;
  if (node?.type === "TemplateLiteral" && node.expressions.length === 0) {
    return node.quasis[0]?.value?.cooked ?? null;
  }
  return null;
}

function callRoot(node: any): string {
  if (!node) return "";
  if (node.type === "Identifier") return node.name;
  if (node.type === "MemberExpression") return callRoot(node.object);
  if (node.type === "CallExpression") return callRoot(node.callee);
  return "";
}

function testCases(source: string): Array<{ name: string; line: number; endLine: number }> {
  const ast = parse(source, {
    sourceType: "unambiguous",
    plugins: ["typescript", "jsx", "decorators-legacy"],
    errorRecovery: true,
  });
  const found: Array<{ name: string; line: number; endLine: number }> = [];
  const visit = (node: any, parents: string[]) => {
    if (!node || typeof node !== "object") return;
    if (node.type === "CallExpression") {
      const call = callRoot(node.callee);
      if (["test", "it"].includes(call)) {
        const name = literalName(node.arguments?.[0]);
        const line = node.loc?.start?.line;
        const endLine = node.loc?.end?.line;
        if (name && line && endLine) {
          found.push({ name: [...parents, name].join(" > "), line, endLine });
        }
      }
      if (["describe", "suite"].includes(call)) {
        const name = literalName(node.arguments?.[0]);
        const callback = node.arguments?.[1];
        if (name && callback) {
          visit(callback.body, [...parents, name]);
          return;
        }
      }
    }
    for (const value of Object.values(node)) {
      if (Array.isArray(value)) value.forEach((child) => visit(child, parents));
      else if (value && typeof value === "object" && value !== node.loc) visit(value, parents);
    }
  };
  visit(ast.program, []);
  return found;
}

function packageManager(root: string): Promise<"pnpm" | "npm" | "yarn" | "bun"> {
  return readdir(root).then((files) => {
    if (files.includes("pnpm-lock.yaml")) return "pnpm";
    if (files.includes("yarn.lock")) return "yarn";
    if (files.includes("bun.lock") || files.includes("bun.lockb")) return "bun";
    return "npm";
  });
}

function resultOutcome(result: RawProcessResult): NormalizedOutcome {
  if (result.interrupted) return "interrupted";
  if (result.timedOut) return "timeout";
  const output = `${result.stdout}\n${result.stderr}`;
  const structured = structuredOutcome(output);
  if (structured) return structured;
  if (result.exitCode === 0) return "pass";
  const assertion = [
    /\bAssertionError\b/i,
    /\bexpected\b[\s\S]{0,120}\b(received|to be|to equal|but got)\b/i,
    /\bTests?:\s+\d+\s+failed\b/i,
    /●\s+.+/,
  ];
  const infrastructure = [
    /\bSyntaxError\b/i,
    /\bCannot find module\b/i,
    /\bMODULE_NOT_FOUND\b/i,
    /\bfailed to (load|resolve) config\b/i,
    /\bNo test files found\b/i,
    /\bTest suite failed to run\b/i,
  ];
  if (infrastructure.some((pattern) => pattern.test(output))) return "infrastructure_failure";
  return assertion.some((pattern) => pattern.test(output))
    ? "assertion_failure"
    : "infrastructure_failure";
}

function structuredOutcome(output: string): NormalizedOutcome | null {
  const candidates = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("{") && line.endsWith("}"));
  for (const candidate of candidates.reverse()) {
    try {
      const data = JSON.parse(candidate) as {
        success?: boolean;
        numFailedTests?: number;
        numFailedTestSuites?: number;
        testResults?: readonly {
          assertionResults?: readonly { status?: string }[];
          status?: string;
          message?: string;
          failureMessage?: string;
        }[];
      };
      if (data.success === true) return "pass";
      const assertions = data.testResults?.flatMap((suite) => suite.assertionResults ?? []) ?? [];
      if (
        assertions.some((assertion) => assertion.status === "failed") ||
        (data.numFailedTests ?? 0) > 0
      ) {
        return "assertion_failure";
      }
      if (
        data.success === false ||
        (data.numFailedTestSuites ?? 0) > 0 ||
        data.testResults?.some((suite) => suite.status === "failed")
      ) {
        return "infrastructure_failure";
      }
    } catch {
      // Continue with other JSON lines and then conservative text normalization.
    }
  }
  return null;
}

export class JavaScriptAdapter implements PatchProofAdapter {
  readonly name = "javascript" as const;

  async detect(repositoryRoot: string): Promise<DetectionResult> {
    const roots = await findManifests(repositoryRoot);
    const supported: string[] = [];
    const evidence: string[] = [];
    for (const root of roots) {
      try {
        const data = await packageData(root);
        const detected = framework(data);
        if (detected) {
          supported.push(relative(repositoryRoot, root).replaceAll("\\", "/") || ".");
          evidence.push(`${relative(repositoryRoot, root) || "."}/package.json (${detected})`);
        }
      } catch {
        // Invalid manifests are diagnosed after explicit project selection.
      }
    }
    return {
      adapter: this.name,
      confidence: supported.length ? "high" : roots.length ? "low" : "none",
      projectRoots: supported.length
        ? supported
        : roots.map((root) => relative(repositoryRoot, root) || "."),
      evidence,
    };
  }

  async validate(context: AdapterContext): Promise<readonly Diagnostic[]> {
    try {
      const detected = framework(
        await packageData(resolve(context.repositoryRoot, context.projectRoot)),
      );
      return detected || context.configuration.targetedTest
        ? []
        : [
            {
              code: "PP_ADAPTER_UNSUPPORTED_FRAMEWORK",
              severity: "error",
              summary: "No Vitest or Jest configuration was detected.",
              remediation: "Configure execution.targetedTest and execution.suite explicitly.",
            },
          ];
    } catch (error) {
      return [
        {
          code: "PP_ADAPTER_INVALID_MANIFEST",
          severity: "error",
          summary: "Unable to read package.json.",
          detail: String(error),
        },
      ];
    }
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
        const source = await readFile(resolve(context.repositoryRoot, entry.path), "utf8");
        const cases = testCases(source).filter(
          (item) =>
            entry.status === "added" ||
            entry.addedLines.some((line) => line >= item.line && line <= item.endLine),
        );
        if (cases.length) {
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
        } else {
          tests.push({
            id: projectPath,
            file: entry.path,
            displayName: projectPath,
            changeKind: entry.status === "added" ? "added" : "modified",
            granularity: "file",
            changedRanges: entry.changedRanges,
            selectionReason: "The changed test file could not be targeted reliably by case.",
            fallbackReason: "No statically targetable changed test declaration was found.",
            diagnostics: [
              {
                code: "PP_DISCOVERY_FILE_FALLBACK",
                severity: "warning",
                summary: "Dynamic or ambiguous test syntax required file-level targeting.",
              },
            ],
          });
        }
      } catch (error) {
        tests.push({
          id: projectPath,
          file: entry.path,
          displayName: projectPath,
          changeKind: entry.status === "added" ? "added" : "modified",
          granularity: "file",
          changedRanges: entry.changedRanges,
          selectionReason: "The changed test file could not be parsed reliably.",
          fallbackReason: String(error),
          diagnostics: [
            {
              code: "PP_DISCOVERY_FILE_FALLBACK",
              severity: "warning",
              summary: "Test parsing failed; using file-level targeting.",
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
    const root = resolve(context.worktreeRoot, context.projectRoot);
    const manager = await packageManager(root);
    const templates = {
      pnpm: ["pnpm", "install", "--frozen-lockfile"],
      npm: ["npm", "ci"],
      yarn: ["yarn", "install", "--immutable"],
      bun: ["bun", "install", "--frozen-lockfile"],
    } as const;
    return commandFromTemplate(templates[manager], { worktree: context.worktreeRoot });
  }

  async targetedTestPlan(test: DiscoveredTest, context: WorktreeContext): Promise<CommandSpec> {
    if (context.configuration.targetedTest) {
      return commandFromTemplate(context.configuration.targetedTest, {
        test_id: test.id,
        test_file: test.file,
        worktree: context.worktreeRoot,
      });
    }
    const root = resolve(context.worktreeRoot, context.projectRoot);
    const data = await packageData(root);
    const detected = framework(data);
    const manager = await packageManager(root);
    const runner = manager === "npm" ? ["npx", "--no-install"] : [manager, "exec"];
    const projectFile =
      context.projectRoot === "." ? test.file : test.file.slice(context.projectRoot.length + 1);
    const args =
      detected === "vitest"
        ? [
            ...runner,
            "vitest",
            "run",
            "--reporter=json",
            projectFile,
            ...(test.granularity === "case" ? ["-t", test.displayName] : []),
          ]
        : [
            ...runner,
            "jest",
            "--runInBand",
            "--json",
            projectFile,
            ...(test.granularity === "case" ? ["-t", test.displayName] : []),
          ];
    return commandFromTemplate(args, {});
  }

  async suitePlan(context: WorktreeContext): Promise<CommandSpec> {
    if (context.configuration.suite) {
      return commandFromTemplate(context.configuration.suite, { worktree: context.worktreeRoot });
    }
    const root = resolve(context.worktreeRoot, context.projectRoot);
    const manager = await packageManager(root);
    const detected = framework(await packageData(root));
    const runner = manager === "npm" ? ["npx", "--no-install"] : [manager, "exec"];
    return commandFromTemplate(
      detected === "vitest"
        ? [...runner, "vitest", "run", "--reporter=json"]
        : [...runner, "jest", "--runInBand", "--json"],
      {},
    );
  }

  normalize(result: RawProcessResult): NormalizedOutcome {
    return resultOutcome(result);
  }
}
