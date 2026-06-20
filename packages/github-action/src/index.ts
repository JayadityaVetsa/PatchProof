import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { DefaultArtifactClient } from "@actions/artifact";
import * as core from "@actions/core";
import { context } from "@actions/github";
import { exitCodeFor, loadConfig, prepareRun, TOOL_VERSION } from "@patchproof/core";
import { findRepositoryRoot } from "@patchproof/git";
import { renderJson, renderMarkdown } from "@patchproof/reporters";

async function main(): Promise<void> {
  try {
    const repositoryRoot = await findRepositoryRoot(process.cwd());
    const payload = context.payload.pull_request;
    const eventBase = payload?.base?.sha;
    const eventHead = payload?.head?.sha;
    const base = core.getInput("base") || eventBase;
    const head = core.getInput("head") || eventHead || process.env.GITHUB_SHA;
    if (!base || !head) {
      throw new Error(
        "Base/head SHAs are unavailable. Use pull_request or provide explicit inputs.",
      );
    }
    const adapterInput = core.getInput("adapter");
    const adapter =
      adapterInput === "javascript" || adapterInput === "python" ? adapterInput : undefined;
    const configInput = core.getInput("config");
    const { config } = await loadConfig(repositoryRoot, configInput || undefined, {
      base,
      head,
      adapter,
      approved: true,
      format: "json",
    });
    const prepared = await prepareRun({
      repositoryRoot,
      config,
      allowDirty: false,
      consent: "ci",
      onProgress: (message) => core.info(message),
    });
    const report = await prepared.execute();
    const reportPath = resolve(repositoryRoot, "patchproof-report.json");
    await writeFile(reportPath, renderJson(report), "utf8");
    await core.summary.addRaw(renderMarkdown(report)).write();
    core.setOutput("version", TOOL_VERSION);
    core.setOutput("status", report.aggregate);
    core.setOutput("report-path", reportPath);
    for (const status of ["proven", "not_proven", "still_failing", "inconclusive"] as const) {
      core.setOutput(
        `${status.replace("_", "-")}-count`,
        report.tests.filter((test) => test.status === status).length,
      );
    }
    if (core.getBooleanInput("upload-report")) {
      await new DefaultArtifactClient().uploadArtifact(
        "patchproof-report",
        [reportPath],
        repositoryRoot,
        { retentionDays: 14 },
      );
    }
    const failOn = (core.getInput("fail-on") || "non-proven")
      .split(",")
      .map((value) => value.trim());
    const shouldFail = failOn.includes("non-proven")
      ? exitCodeFor(report.aggregate) !== 0
      : failOn.includes(report.aggregate);
    if (shouldFail) core.setFailed(`PatchProof aggregate: ${report.aggregate}`);
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error));
  }
}

await main();
