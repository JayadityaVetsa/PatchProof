import { performance } from "node:perf_hooks";
import { resolve } from "node:path";
import type {
  AdapterContext,
  CommandSpec,
  Diagnostic,
  DiscoveredTest,
  NormalizedOutcome,
  PatchProofAdapter,
  PatchProofReport,
  ProcessEvidence,
  RawProcessResult,
  SuiteEvidence,
  TestEvidence,
  WorktreeContext,
} from "@patchproof/adapter-api";
import { JavaScriptAdapter } from "@patchproof/adapter-javascript";
import { PythonAdapter } from "@patchproof/adapter-python";
import {
  computeDiff,
  createWorktrees,
  isAncestor,
  isDirty,
  mergeBase,
  resolveRevision,
  transplantFiles,
} from "@patchproof/git";
import { runCommand } from "@patchproof/process";
import { aggregateStatus, classifyTest, compareSuites } from "./classifier.js";
import type { PatchProofConfig } from "./config.js";

const adapters: readonly PatchProofAdapter[] = [new JavaScriptAdapter(), new PythonAdapter()];

export interface EngineOptions {
  readonly repositoryRoot: string;
  readonly config: PatchProofConfig;
  readonly allowDirty: boolean;
  readonly consent: "interactive" | "flag" | "configuration" | "ci";
  readonly signal?: AbortSignal | undefined;
  readonly onProgress?: ((message: string) => void) | undefined;
}

export interface ExecutionPreview {
  readonly repositoryRoot: string;
  readonly baseSha: string;
  readonly headSha: string;
  readonly adapter: string;
  readonly projectRoot: string;
  readonly commands: readonly string[];
}

export interface PreparedRun {
  readonly preview: ExecutionPreview;
  execute(): Promise<PatchProofReport>;
}

async function chooseAdapter(
  root: string,
  configured: PatchProofConfig["adapter"],
  projectRoot: string,
): Promise<{ adapter: PatchProofAdapter; projectRoot: string }> {
  if (configured) {
    const adapter = adapters.find((candidate) => candidate.name === configured)!;
    const detection = await adapter.detect(root);
    if (projectRoot === "." && detection.projectRoots.length > 1) {
      throw new Error(
        `Multiple ${configured} projects were detected (${detection.projectRoots.join(", ")}). Configure projectRoot.`,
      );
    }
    return {
      adapter,
      projectRoot:
        projectRoot === "." && detection.projectRoots.length === 1
          ? detection.projectRoots[0]!
          : projectRoot,
    };
  }
  const detections = await Promise.all(
    adapters.map(async (adapter) => ({ adapter, result: await adapter.detect(root) })),
  );
  const candidates = detections.filter((item) => item.result.confidence === "high");
  if (candidates.length !== 1) {
    throw new Error(
      candidates.length
        ? `Multiple adapters match (${candidates.map((item) => item.adapter.name).join(", ")}). Pass --adapter.`
        : "No supported Vitest, Jest, or pytest project was detected. Pass --adapter and explicit commands.",
    );
  }
  const selected = candidates[0]!;
  if (projectRoot === "." && selected.result.projectRoots.length > 1) {
    throw new Error(
      `Multiple projects were detected (${selected.result.projectRoots.join(", ")}). Configure projectRoot.`,
    );
  }
  return {
    adapter: selected.adapter,
    projectRoot:
      projectRoot === "." && selected.result.projectRoots.length === 1
        ? selected.result.projectRoots[0]!
        : projectRoot,
  };
}

function adapterContext(
  repositoryRoot: string,
  projectRoot: string,
  config: PatchProofConfig,
): AdapterContext {
  return {
    repositoryRoot,
    projectRoot,
    configuration: {
      ...(config.execution.setup ? { setup: config.execution.setup } : {}),
      ...(config.execution.targetedTest ? { targetedTest: config.execution.targetedTest } : {}),
      ...(config.execution.suite ? { suite: config.execution.suite } : {}),
      include: config.tests.include,
      exclude: config.tests.exclude,
      support: config.tests.support,
    },
  };
}

function worktreeContext(
  context: AdapterContext,
  worktreeRoot: string,
  role: "base" | "head",
): WorktreeContext {
  return { ...context, worktreeRoot, role };
}

function evidence(
  command: CommandSpec,
  role: "base" | "head",
  startedAt: string,
  started: number,
  result: RawProcessResult & { truncated: boolean },
  outcome: NormalizedOutcome,
): ProcessEvidence {
  return {
    command,
    cwdRole: role,
    startedAt,
    durationMs: Math.round(performance.now() - started),
    exitCode: result.exitCode,
    signal: result.signal,
    outcome,
    stdout: result.stdout,
    stderr: result.stderr,
    truncated: result.truncated,
  };
}

async function execute(
  adapter: PatchProofAdapter,
  command: CommandSpec,
  context: WorktreeContext,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<ProcessEvidence> {
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const raw = await runCommand(command, {
    cwd: resolve(context.worktreeRoot, context.projectRoot),
    timeoutMs,
    signal,
  });
  return evidence(command, context.role, startedAt, started, raw, adapter.normalize(raw, "test"));
}

export async function prepareRun(options: EngineOptions): Promise<PreparedRun> {
  const startedAt = new Date().toISOString();
  const started = performance.now();
  const root = options.repositoryRoot;
  const baseRef = options.config.base ?? (await mergeBase(root, options.config.head ?? "HEAD"));
  const headRef = options.config.head ?? "HEAD";
  const [baseSha, headSha, dirty] = await Promise.all([
    resolveRevision(root, baseRef),
    resolveRevision(root, headRef),
    isDirty(root),
  ]);
  if (dirty && !options.allowDirty) {
    throw new Error("The active worktree is dirty. Commit/stash changes or pass --allow-dirty.");
  }
  if (!(await isAncestor(root, baseSha, headSha))) {
    throw new Error("Base is not an ancestor of head. Choose a valid comparison base.");
  }
  const selected = await chooseAdapter(root, options.config.adapter, options.config.projectRoot);
  const context = adapterContext(root, selected.projectRoot, options.config);
  const diagnostics = await selected.adapter.validate(context);
  if (diagnostics.some((item) => item.severity === "error")) {
    throw new Error(diagnostics.map((item) => item.summary).join(" "));
  }
  const preview: ExecutionPreview = {
    repositoryRoot: root,
    baseSha,
    headSha,
    adapter: selected.adapter.name,
    projectRoot: selected.projectRoot,
    commands: [
      options.config.execution.setup
        ? String(options.config.execution.setup)
        : "adapter-inferred setup",
      options.config.execution.targetedTest
        ? String(options.config.execution.targetedTest)
        : "adapter-inferred targeted test",
      options.config.execution.suite
        ? String(options.config.execution.suite)
        : "adapter-inferred suite",
    ],
  };

  return {
    preview,
    async execute() {
      const globalDiagnostics: Diagnostic[] = [...diagnostics];
      let worktrees: Awaited<ReturnType<typeof createWorktrees>> | undefined;
      try {
        options.onProgress?.("Computing changed tests");
        const diff = await computeDiff(root, baseSha, headSha);
        const tests = await selected.adapter.discoverTests(context, diff);
        const eligible = tests.filter((test) => test.changeKind !== "deleted");
        const deleted = tests.filter((test) => test.changeKind === "deleted");
        for (const test of deleted) {
          globalDiagnostics.push({
            code: "PP_TEST_DELETED",
            severity: "warning",
            summary: `Deleted test '${test.id}' cannot be proven.`,
          });
        }
        options.onProgress?.("Creating isolated Git worktrees");
        worktrees = await createWorktrees(root, baseSha, headSha);
        const baseContext = worktreeContext(context, worktrees.base, "base");
        const headContext = worktreeContext(context, worktrees.head, "head");
        const setupBase = await selected.adapter.setupPlan(baseContext);
        const setupHead = await selected.adapter.setupPlan(headContext);
        if (setupBase) {
          options.onProgress?.("Preparing base dependencies");
          const setup = await execute(
            selected.adapter,
            setupBase,
            baseContext,
            options.config.execution.suiteTimeoutSeconds * 1000,
            options.signal,
          );
          if (setup.outcome !== "pass") {
            throw new Error(`Base setup failed (${setup.outcome}).`);
          }
        }
        if (setupHead) {
          options.onProgress?.("Preparing head dependencies");
          const setup = await execute(
            selected.adapter,
            setupHead,
            headContext,
            options.config.execution.suiteTimeoutSeconds * 1000,
            options.signal,
          );
          if (setup.outcome !== "pass") {
            throw new Error(`Head setup failed (${setup.outcome}).`);
          }
        }

        options.onProgress?.("Comparing base and head suites");
        const [baseSuiteCommand, headSuiteCommand] = await Promise.all([
          selected.adapter.suitePlan(baseContext),
          selected.adapter.suitePlan(headContext),
        ]);
        const [baseSuite, headSuite] = await Promise.all([
          execute(
            selected.adapter,
            baseSuiteCommand,
            baseContext,
            options.config.execution.suiteTimeoutSeconds * 1000,
            options.signal,
          ),
          execute(
            selected.adapter,
            headSuiteCommand,
            headContext,
            options.config.execution.suiteTimeoutSeconds * 1000,
            options.signal,
          ),
        ]);
        const suiteStatus = compareSuites(baseSuite.outcome, headSuite.outcome);
        const suite: SuiteEvidence = {
          status: suiteStatus,
          base: baseSuite,
          head: headSuite,
          diagnostics:
            suiteStatus === "regression"
              ? [
                  {
                    code: "PP_HEAD_SUITE_REGRESSION",
                    severity: "error",
                    summary: "The suite passes on base and fails on head.",
                  },
                ]
              : suiteStatus === "pre_existing_failure"
                ? [
                    {
                      code: "PP_SUITE_PRE_EXISTING_FAILURE",
                      severity: "warning",
                      summary:
                        "The suite fails on both revisions; this is not attributed to the patch.",
                    },
                  ]
                : [],
        };

        const support = await selected.adapter.supportFiles(context, diff);
        const transplant = [...new Set([...eligible.map((test) => test.file), ...support])];
        const allowed = [
          ...options.config.tests.include,
          ...options.config.tests.support,
          "**/*.test.{js,jsx,ts,tsx,mjs,cjs}",
          "**/*.spec.{js,jsx,ts,tsx,mjs,cjs}",
          "**/test_*.py",
          "**/*_test.py",
        ];
        if (transplant.length) {
          options.onProgress?.("Transplanting changed tests onto base");
          await transplantFiles(root, headSha, worktrees.base, transplant, allowed);
        }

        const testEvidence: TestEvidence[] = [];
        for (const test of eligible) {
          options.onProgress?.(`Evaluating ${test.id}`);
          testEvidence.push(
            await evaluateTest(
              selected.adapter,
              test,
              baseContext,
              headContext,
              options.config.execution.timeoutSeconds * 1000,
              options.signal,
            ),
          );
        }
        const aggregate = aggregateStatus(
          testEvidence.map((test) => test.status),
          suite.status,
        );
        return {
          schemaVersion: 1,
          tool: { name: "patchproof", version: "0.1.0" },
          repository: {
            root,
            projectRoot: selected.projectRoot,
            baseSha,
            headSha,
            dirtyOverride: dirty && options.allowDirty,
          },
          execution: {
            adapter: selected.adapter.name,
            consent: options.consent,
            startedAt,
            durationMs: Math.round(performance.now() - started),
          },
          tests: testEvidence,
          suite,
          aggregate,
          diagnostics: globalDiagnostics,
          limitations: [
            "Proof applies only to the reported tests and revisions.",
            "Commands run on the host with the current user's permissions.",
            ...(dirty && options.allowDirty
              ? ["Uncommitted active-worktree changes were excluded from the comparison."]
              : []),
          ],
        };
      } finally {
        if (worktrees && !options.config.execution.keepWorktrees) {
          const failures = await worktrees.cleanup();
          if (failures.length) options.onProgress?.(`Cleanup incomplete: ${failures.join("; ")}`);
        } else if (worktrees) {
          options.onProgress?.(`Retained worktrees at ${worktrees.root}`);
        }
      }
    },
  };
}

async function evaluateTest(
  adapter: PatchProofAdapter,
  test: DiscoveredTest,
  baseContext: WorktreeContext,
  headContext: WorktreeContext,
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<TestEvidence> {
  try {
    const [baseCommand, headCommand] = await Promise.all([
      adapter.targetedTestPlan(test, baseContext),
      adapter.targetedTestPlan(test, headContext),
    ]);
    const [base, head] = await Promise.all([
      execute(adapter, baseCommand, baseContext, timeoutMs, signal),
      execute(adapter, headCommand, headContext, timeoutMs, signal),
    ]);
    return {
      id: test.id,
      file: test.file,
      displayName: test.displayName,
      granularity: test.granularity,
      status: classifyTest(base.outcome, head.outcome),
      base,
      head,
      diagnostics: test.diagnostics,
    };
  } catch (error) {
    return {
      id: test.id,
      file: test.file,
      displayName: test.displayName,
      granularity: test.granularity,
      status: "inconclusive",
      diagnostics: [
        ...test.diagnostics,
        {
          code: "PP_TEST_EXECUTION_FAILED",
          severity: "error",
          summary: "The test could not be evaluated reliably.",
          detail: String(error),
        },
      ],
    };
  }
}
