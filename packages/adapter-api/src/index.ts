export type AdapterName = "javascript" | "python";
export type TestStatus = "proven" | "not_proven" | "still_failing" | "inconclusive";
export type AggregateStatus = TestStatus | "no_tests" | "regression" | "error";
export type NormalizedOutcome =
  | "pass"
  | "assertion_failure"
  | "infrastructure_failure"
  | "timeout"
  | "interrupted";
export type SuiteStatus =
  | "healthy"
  | "regression"
  | "improved"
  | "pre_existing_failure"
  | "inconclusive"
  | "not_run";

export interface Diagnostic {
  readonly code: string;
  readonly severity: "info" | "warning" | "error";
  readonly summary: string;
  readonly detail?: string;
  readonly remediation?: string;
}

export interface CommandSpec {
  readonly executable?: string;
  readonly args?: readonly string[];
  readonly shell?: string;
  readonly display: string;
}

export interface ProcessEvidence {
  readonly command: CommandSpec;
  readonly cwdRole: "source" | "base" | "head";
  readonly startedAt: string;
  readonly durationMs: number;
  readonly exitCode: number | null;
  readonly signal: string | null;
  readonly outcome: NormalizedOutcome;
  readonly stdout: string;
  readonly stderr: string;
  readonly truncated: boolean;
}

export interface RepositoryDiffEntry {
  readonly status: "added" | "modified" | "deleted" | "renamed";
  readonly path: string;
  readonly oldPath?: string;
  readonly addedLines: readonly number[];
}

export interface RepositoryDiff {
  readonly baseSha: string;
  readonly headSha: string;
  readonly entries: readonly RepositoryDiffEntry[];
}

export interface DiscoveredTest {
  readonly id: string;
  readonly file: string;
  readonly displayName: string;
  readonly changeKind: "added" | "modified" | "deleted";
  readonly granularity: "case" | "file";
  readonly line?: number;
  readonly diagnostics: readonly Diagnostic[];
}

export interface DetectionResult {
  readonly adapter: AdapterName;
  readonly confidence: "none" | "low" | "high";
  readonly projectRoots: readonly string[];
  readonly evidence: readonly string[];
}

export interface AdapterContext {
  readonly repositoryRoot: string;
  readonly projectRoot: string;
  readonly configuration: AdapterConfiguration;
}

export interface WorktreeContext extends AdapterContext {
  readonly worktreeRoot: string;
  readonly role: "base" | "head";
}

export interface AdapterConfiguration {
  readonly setup?: CommandTemplate | undefined;
  readonly targetedTest?: CommandTemplate | undefined;
  readonly suite?: CommandTemplate | undefined;
  readonly include: readonly string[];
  readonly exclude: readonly string[];
  readonly support: readonly string[];
}

export type CommandTemplate = string | readonly string[];

export interface PatchProofAdapter {
  readonly name: AdapterName;
  detect(repositoryRoot: string): Promise<DetectionResult>;
  validate(context: AdapterContext): Promise<readonly Diagnostic[]>;
  discoverTests(context: AdapterContext, diff: RepositoryDiff): Promise<readonly DiscoveredTest[]>;
  supportFiles(context: AdapterContext, diff: RepositoryDiff): Promise<readonly string[]>;
  setupPlan(context: WorktreeContext): Promise<CommandSpec | null>;
  targetedTestPlan(test: DiscoveredTest, context: WorktreeContext): Promise<CommandSpec>;
  suitePlan(context: WorktreeContext): Promise<CommandSpec>;
  normalize(result: RawProcessResult, phase: "test" | "suite"): NormalizedOutcome;
}

export interface RawProcessResult {
  readonly exitCode: number | null;
  readonly signal: string | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly timedOut: boolean;
  readonly interrupted: boolean;
}

export interface TestEvidence {
  readonly id: string;
  readonly file: string;
  readonly displayName: string;
  readonly granularity: "case" | "file";
  readonly status: TestStatus;
  readonly base?: ProcessEvidence;
  readonly head?: ProcessEvidence;
  readonly diagnostics: readonly Diagnostic[];
}

export interface SuiteEvidence {
  readonly status: SuiteStatus;
  readonly base?: ProcessEvidence;
  readonly head?: ProcessEvidence;
  readonly diagnostics: readonly Diagnostic[];
}

export interface PatchProofReport {
  readonly schemaVersion: 1;
  readonly tool: { readonly name: "patchproof"; readonly version: string };
  readonly repository: {
    readonly root: string;
    readonly projectRoot: string;
    readonly baseSha: string;
    readonly headSha: string;
    readonly dirtyOverride: boolean;
  };
  readonly execution: {
    readonly adapter: AdapterName;
    readonly consent: "interactive" | "flag" | "configuration" | "ci";
    readonly startedAt: string;
    readonly durationMs: number;
  };
  readonly tests: readonly TestEvidence[];
  readonly suite: SuiteEvidence;
  readonly aggregate: AggregateStatus;
  readonly diagnostics: readonly Diagnostic[];
  readonly limitations: readonly string[];
}

export function commandFromTemplate(
  template: CommandTemplate,
  values: Readonly<Record<string, string>>,
): CommandSpec {
  const replace = (value: string): string =>
    value.replace(/\{(test_id|test_file|worktree)\}/g, (_, key: string) => values[key] ?? "");
  if (typeof template === "string") {
    const shell = replace(template);
    return { shell, display: shell };
  }
  const [executable, ...args] = template.map(replace);
  if (!executable) throw new Error("Command array must contain an executable.");
  return { executable, args, display: [executable, ...args].join(" ") };
}
