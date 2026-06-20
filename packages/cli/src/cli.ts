#!/usr/bin/env node
import { writeFile } from "node:fs/promises";
import process from "node:process";
import { createInterface } from "node:readline/promises";
import { Command, InvalidArgumentError } from "commander";
import {
  exitCodeFor,
  inspectRun,
  loadConfig,
  prepareRun,
  TOOL_VERSION,
  type ConfigOverrides,
} from "@patchproof/core";
import { findRepositoryRoot } from "@patchproof/git";
import { renderInspection, renderReport } from "@patchproof/reporters";

function duration(value: string): number {
  const match = /^(\d+)(ms|s|m)?$/.exec(value);
  if (!match) throw new InvalidArgumentError("Use a duration such as 120s or 2m.");
  const amount = Number(match[1]);
  const unit = match[2] ?? "s";
  const seconds = unit === "m" ? amount * 60 : unit === "ms" ? Math.ceil(amount / 1000) : amount;
  if (seconds <= 0 || seconds > 86_400) throw new InvalidArgumentError("Duration is out of range.");
  return seconds;
}

async function confirmExecution(
  preview: Awaited<ReturnType<typeof prepareRun>>["preview"],
): Promise<boolean> {
  process.stderr.write(
    [
      "PatchProof will execute repository commands with your user permissions.",
      `Repository: ${preview.repositoryRoot}`,
      `Base: ${preview.baseSha}`,
      `Head: ${preview.headSha}`,
      `Adapter: ${preview.adapter}`,
      `Project: ${preview.projectRoot}`,
      "Commands:",
      ...preview.commands.map((command) => `  - ${command}`),
      "",
    ].join("\n"),
  );
  if (!process.stdin.isTTY) return false;
  const readline = createInterface({ input: process.stdin, output: process.stderr });
  try {
    return /^(y|yes)$/i.test((await readline.question("Continue? [y/N] ")).trim());
  } finally {
    readline.close();
  }
}

const program = new Command()
  .name("patchproof")
  .description("Prove that changed regression tests distinguish head from base.")
  .version(TOOL_VERSION);

program
  .command("inspect")
  .description("Show selected changed tests without executing repository code.")
  .option("--base <ref>", "base Git revision")
  .option("--head <ref>", "head Git revision")
  .option("--config <path>", "configuration file")
  .option("--adapter <name>", "javascript or python")
  .option("--project-root <path>", "project root inside the repository")
  .option("--format <format>", "text, markdown, or json", "text")
  .option("--output <path>", "write inspection to a file")
  .option("--allow-dirty", "inspect committed revisions despite active changes")
  .action(async (raw: Record<string, unknown>) => {
    try {
      const repositoryRoot = await findRepositoryRoot(process.cwd());
      const adapter =
        raw.adapter === undefined
          ? undefined
          : raw.adapter === "javascript" || raw.adapter === "python"
            ? raw.adapter
            : (() => {
                throw new Error("--adapter must be javascript or python.");
              })();
      const format =
        raw.format === "text" || raw.format === "markdown" || raw.format === "json"
          ? raw.format
          : (() => {
              throw new Error("--format must be text, markdown, or json.");
            })();
      const { config } = await loadConfig(repositoryRoot, raw.config as string | undefined, {
        base: raw.base as string | undefined,
        head: raw.head as string | undefined,
        adapter,
        projectRoot: raw.projectRoot as string | undefined,
      });
      const inspection = await inspectRun({
        repositoryRoot,
        config,
        allowDirty: Boolean(raw.allowDirty),
      });
      const output = renderInspection(inspection, format);
      if (raw.output) await writeFile(String(raw.output), output, "utf8");
      else process.stdout.write(output);
    } catch (error) {
      process.stderr.write(
        `PatchProof error: ${error instanceof Error ? error.message : String(error)}\n`,
      );
      process.exitCode = 2;
    }
  });

program
  .command("check")
  .description("Evaluate changed tests against base and head revisions.")
  .option("--base <ref>", "base Git revision")
  .option("--head <ref>", "head Git revision")
  .option("--config <path>", "configuration file")
  .option("--adapter <name>", "javascript or python")
  .option("--project-root <path>", "project root inside the repository")
  .option("--test-command <command>", "trusted targeted test shell command")
  .option("--suite-command <command>", "trusted suite shell command")
  .option("--setup-command <command>", "trusted setup shell command")
  .option("--timeout <duration>", "per-test timeout", duration)
  .option("--format <format>", "text, markdown, or json")
  .option("--output <path>", "write report to a file")
  .option("--yes", "approve host execution")
  .option("--allow-dirty", "compare committed revisions despite active changes")
  .option("--keep-worktrees", "retain temporary worktrees")
  .option("--no-color", "disable color")
  .option("--quiet", "suppress progress")
  .option("--debug", "include detailed evidence")
  .action(async (raw: Record<string, unknown>) => {
    const abort = new AbortController();
    let interrupted = false;
    let executionStarted = false;
    const onInterrupt = () => {
      interrupted = true;
      abort.abort();
    };
    process.once("SIGINT", onInterrupt);
    process.once("SIGTERM", onInterrupt);
    try {
      const repositoryRoot = await findRepositoryRoot(process.cwd());
      const adapter =
        raw.adapter === undefined
          ? undefined
          : raw.adapter === "javascript" || raw.adapter === "python"
            ? raw.adapter
            : (() => {
                throw new Error("--adapter must be javascript or python.");
              })();
      const format =
        raw.format === undefined
          ? undefined
          : raw.format === "text" || raw.format === "markdown" || raw.format === "json"
            ? raw.format
            : (() => {
                throw new Error("--format must be text, markdown, or json.");
              })();
      const overrides: ConfigOverrides = {
        base: raw.base as string | undefined,
        head: raw.head as string | undefined,
        adapter,
        projectRoot: raw.projectRoot as string | undefined,
        setup: raw.setupCommand as string | undefined,
        targetedTest: raw.testCommand as string | undefined,
        suite: raw.suiteCommand as string | undefined,
        timeoutSeconds: raw.timeout as number | undefined,
        format,
        output: raw.output as string | undefined,
        approved: raw.yes as boolean | undefined,
        keepWorktrees: raw.keepWorktrees as boolean | undefined,
      };
      const { config } = await loadConfig(
        repositoryRoot,
        raw.config as string | undefined,
        overrides,
      );
      const ci = process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true";
      const consent = ci
        ? ("ci" as const)
        : raw.yes
          ? ("flag" as const)
          : config.execution.approved
            ? ("configuration" as const)
            : ("interactive" as const);
      const prepared = await prepareRun({
        repositoryRoot,
        config,
        allowDirty: Boolean(raw.allowDirty),
        consent,
        signal: abort.signal,
        onProgress: raw.quiet ? undefined : (message) => process.stderr.write(`${message}\n`),
      });
      if (consent === "interactive" && !(await confirmExecution(prepared.preview))) {
        process.stderr.write("Execution declined. No repository commands were run.\n");
        process.exitCode = 4;
        return;
      }
      executionStarted = true;
      const report = await prepared.execute();
      const output = renderReport(report, config.report.format, Boolean(raw.debug));
      if (config.report.output) await writeFile(config.report.output, output, "utf8");
      else process.stdout.write(output);
      process.exitCode = exitCodeFor(report.aggregate);
    } catch (error) {
      if (interrupted) {
        process.stderr.write("PatchProof was interrupted.\n");
        process.exitCode = 4;
      } else {
        process.stderr.write(
          `PatchProof error: ${error instanceof Error ? error.message : String(error)}\n`,
        );
        process.exitCode = executionStarted ? 3 : 2;
      }
    } finally {
      process.removeListener("SIGINT", onInterrupt);
      process.removeListener("SIGTERM", onInterrupt);
    }
  });

if (process.argv.length <= 2) program.help();
program.parseAsync(process.argv).catch((error: unknown) => {
  process.stderr.write(
    `PatchProof error: ${error instanceof Error ? error.message : String(error)}\n`,
  );
  process.exitCode = 5;
});
