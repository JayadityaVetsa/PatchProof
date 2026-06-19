import type { PatchProofReport, TestStatus } from "@patchproof/adapter-api";

function counts(report: PatchProofReport): Record<TestStatus, number> {
  return {
    proven: report.tests.filter((test) => test.status === "proven").length,
    not_proven: report.tests.filter((test) => test.status === "not_proven").length,
    still_failing: report.tests.filter((test) => test.status === "still_failing").length,
    inconclusive: report.tests.filter((test) => test.status === "inconclusive").length,
  };
}

export function renderJson(report: PatchProofReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function renderText(report: PatchProofReport, debug = false): string {
  const total = counts(report);
  const lines = [
    `PatchProof ${report.tool.version}`,
    `Base:  ${report.repository.baseSha.slice(0, 12)}`,
    `Head:  ${report.repository.headSha.slice(0, 12)}`,
    `Adapter: ${report.execution.adapter}`,
    "",
    `Aggregate: ${report.aggregate.toUpperCase()}`,
    `Suite: ${report.suite.status}`,
  ];
  for (const test of report.tests) {
    lines.push(`${test.status.toUpperCase().padEnd(14)} ${test.id}`);
    for (const diagnostic of test.diagnostics)
      lines.push(`  ${diagnostic.code}: ${diagnostic.summary}`);
    if (debug) {
      if (test.base) lines.push(`  base: ${test.base.command.display} (${test.base.outcome})`);
      if (test.head) lines.push(`  head: ${test.head.command.display} (${test.head.outcome})`);
    }
  }
  lines.push(
    "",
    `${total.proven} proven, ${total.not_proven} not proven, ${total.still_failing} still failing, ${total.inconclusive} inconclusive`,
  );
  for (const diagnostic of [...report.diagnostics, ...report.suite.diagnostics]) {
    lines.push(`${diagnostic.severity.toUpperCase()} ${diagnostic.code}: ${diagnostic.summary}`);
    if (debug && diagnostic.detail) lines.push(`  ${diagnostic.detail}`);
  }
  lines.push("", ...report.limitations.map((item) => `Limitation: ${item}`));
  lines.push(
    "Reproduce with the same --base and --head revisions; add --debug to retain evidence.",
  );
  return `${lines.join("\n")}\n`;
}

export function renderMarkdown(report: PatchProofReport): string {
  const total = counts(report);
  const lines = [
    `# PatchProof: ${report.aggregate.toUpperCase()}`,
    "",
    `- Base: \`${report.repository.baseSha}\``,
    `- Head: \`${report.repository.headSha}\``,
    `- Adapter: \`${report.execution.adapter}\``,
    `- Suite: **${report.suite.status}**`,
    "",
    "| Status | Test | Base | Head |",
    "|---|---|---|---|",
  ];
  for (const test of report.tests) {
    lines.push(
      `| ${test.status} | \`${test.id}\` | ${test.base?.outcome ?? "not run"} | ${test.head?.outcome ?? "not run"} |`,
    );
  }
  lines.push(
    "",
    `${total.proven} proven · ${total.not_proven} not proven · ${total.still_failing} still failing · ${total.inconclusive} inconclusive`,
    "",
    "## Limitations",
    "",
    ...report.limitations.map((item) => `- ${item}`),
  );
  return `${lines.join("\n")}\n`;
}

export function renderReport(
  report: PatchProofReport,
  format: "text" | "markdown" | "json",
  debug = false,
): string {
  if (format === "json") return renderJson(report);
  if (format === "markdown") return renderMarkdown(report);
  return renderText(report, debug);
}
