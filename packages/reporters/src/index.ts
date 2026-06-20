import type { InspectionResult, PatchProofReport, TestStatus } from "@patchproof/adapter-api";

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
    lines.push(`  selected: ${test.selection.reason}`);
    if (test.selection.fallbackReason) lines.push(`  fallback: ${test.selection.fallbackReason}`);
    for (const diagnostic of test.diagnostics) {
      lines.push(`  ${diagnostic.code}: ${diagnostic.summary}`);
    }
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
    "Reproduce with the same --base and --head revisions; use `patchproof inspect` to review selection first.",
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
    "| Status | Test | Selection | Base | Head |",
    "|---|---|---|---|---|",
  ];
  for (const test of report.tests) {
    lines.push(
      `| ${test.status} | \`${test.id}\` | ${test.selection.reason} | ${test.base?.outcome ?? "not run"} | ${test.head?.outcome ?? "not run"} |`,
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

export function renderInspection(
  inspection: InspectionResult,
  format: "text" | "markdown" | "json",
): string {
  if (format === "json") return `${JSON.stringify(inspection, null, 2)}\n`;
  const markdown = format === "markdown";
  const lines = markdown
    ? [
        "# PatchProof inspection",
        "",
        `- Base: \`${inspection.repository.baseSha}\``,
        `- Head: \`${inspection.repository.headSha}\``,
        `- Adapter: \`${inspection.adapter}\``,
        "",
        "## Selected tests",
        "",
      ]
    : [
        `PatchProof ${inspection.tool.version} inspection`,
        `Base: ${inspection.repository.baseSha}`,
        `Head: ${inspection.repository.headSha}`,
        `Adapter: ${inspection.adapter}`,
        "",
        "Selected tests:",
      ];
  if (!inspection.tests.length) lines.push(markdown ? "- None" : "  None");
  for (const test of inspection.tests) {
    const span = test.sourceRange
      ? ` lines ${test.sourceRange.startLine}-${test.sourceRange.endLine}`
      : "";
    lines.push(
      markdown
        ? `- \`${test.id}\` (${test.granularity}${span})`
        : `  ${test.id} (${test.granularity}${span})`,
    );
    lines.push(markdown ? `  - ${test.selectionReason}` : `    ${test.selectionReason}`);
    if (test.fallbackReason) {
      lines.push(
        markdown ? `  - Fallback: ${test.fallbackReason}` : `    Fallback: ${test.fallbackReason}`,
      );
    }
  }
  lines.push("", markdown ? "## Commands" : "Commands:");
  lines.push(
    markdown
      ? `- Setup: \`${inspection.commands.setup}\``
      : `  Setup: ${inspection.commands.setup}`,
  );
  for (const target of inspection.commands.targeted) {
    lines.push(
      markdown
        ? `- \`${target.testId}\`: \`${target.command}\``
        : `  ${target.testId}: ${target.command}`,
    );
  }
  lines.push(
    markdown
      ? `- Suite: \`${inspection.commands.suite}\``
      : `  Suite: ${inspection.commands.suite}`,
  );
  lines.push(
    "",
    ...inspection.limitations.map((item) => (markdown ? `- ${item}` : `Limitation: ${item}`)),
  );
  return `${lines.join("\n")}\n`;
}
