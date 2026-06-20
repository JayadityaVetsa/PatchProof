import { homedir, tmpdir } from "node:os";
import type {
  CommandSpec,
  Diagnostic,
  PatchProofReport,
  ProcessEvidence,
} from "@patchproof/adapter-api";

const SECRET_NAME = /(token|secret|password|passwd|api[_-]?key|credential|authorization|cookie)/i;

export interface RedactionContext {
  readonly repositoryRoot: string;
  readonly worktreeRoot?: string;
}

function variants(value: string): string[] {
  if (!value) return [];
  return [...new Set([value, value.replaceAll("\\", "/"), value.replaceAll("/", "\\")])];
}

export function secretEnvironmentValues(environment: NodeJS.ProcessEnv = process.env): string[] {
  return Object.entries(environment)
    .filter(([name, value]) => SECRET_NAME.test(name) && Boolean(value))
    .map(([, value]) => value!)
    .filter((value) => value.length >= 4);
}

export function redactText(value: string, context: RedactionContext): string {
  let result = value;
  const replacements: ReadonlyArray<readonly [string, string]> = [
    ...variants(context.repositoryRoot).map((path) => [path, "<repository>"] as const),
    ...variants(context.worktreeRoot ?? "").map((path) => [path, "<worktrees>"] as const),
    ...variants(homedir()).map((path) => [path, "<home>"] as const),
    ...variants(tmpdir()).map((path) => [path, "<temp>"] as const),
    ...secretEnvironmentValues().map((secret) => [secret, "[REDACTED]"] as const),
  ];
  for (const [sensitive, replacement] of replacements) {
    if (sensitive) result = result.split(sensitive).join(replacement);
  }
  result = result.replace(
    /((?:token|secret|password|passwd|api[_-]?key|credential|authorization|cookie)\s*[=:]\s*)([^\s,;]+)/gi,
    "$1[REDACTED]",
  );
  return result
    .split(/\r?\n/)
    .map((line) => (line.startsWith("::") ? `\u200b${line}` : line))
    .join("\n");
}

function sanitizeCommand(command: CommandSpec, context: RedactionContext): CommandSpec {
  return {
    ...(command.executable ? { executable: redactText(command.executable, context) } : {}),
    ...(command.args ? { args: command.args.map((item) => redactText(item, context)) } : {}),
    ...(command.shell ? { shell: redactText(command.shell, context) } : {}),
    display: redactText(command.display, context),
  };
}

function sanitizeProcess(
  evidence: ProcessEvidence | undefined,
  context: RedactionContext,
): ProcessEvidence | undefined {
  if (!evidence) return undefined;
  return {
    ...evidence,
    command: sanitizeCommand(evidence.command, context),
    stdout: redactText(evidence.stdout, context),
    stderr: redactText(evidence.stderr, context),
  };
}

function sanitizeDiagnostic(diagnostic: Diagnostic, context: RedactionContext): Diagnostic {
  return {
    ...diagnostic,
    summary: redactText(diagnostic.summary, context),
    ...(diagnostic.detail ? { detail: redactText(diagnostic.detail, context) } : {}),
    ...(diagnostic.remediation ? { remediation: redactText(diagnostic.remediation, context) } : {}),
  };
}

export function sanitizeReport(
  report: PatchProofReport,
  context: RedactionContext,
): PatchProofReport {
  return {
    ...report,
    repository: { ...report.repository, root: "<repository>" },
    tests: report.tests.map((test) => ({
      ...test,
      ...(test.base ? { base: sanitizeProcess(test.base, context)! } : {}),
      ...(test.head ? { head: sanitizeProcess(test.head, context)! } : {}),
      diagnostics: test.diagnostics.map((item) => sanitizeDiagnostic(item, context)),
    })),
    suite: {
      ...report.suite,
      ...(report.suite.base ? { base: sanitizeProcess(report.suite.base, context)! } : {}),
      ...(report.suite.head ? { head: sanitizeProcess(report.suite.head, context)! } : {}),
      diagnostics: report.suite.diagnostics.map((item) => sanitizeDiagnostic(item, context)),
    },
    diagnostics: report.diagnostics.map((item) => sanitizeDiagnostic(item, context)),
    limitations: report.limitations.map((item) => redactText(item, context)),
  };
}
