import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const resultsDirectory = join(root, "benchmarks", "results");
const files = (await readdir(resultsDirectory)).filter((name) => name.endsWith(".json"));
const results = await Promise.all(
  files.map(async (name) => JSON.parse(await readFile(join(resultsDirectory, name), "utf8"))),
);
results.sort((left, right) => left.id.localeCompare(right.id));

const rows = results.map(
  (result) =>
    `| ${result.id} | ${result.mode} | ${result.actualStatus ?? "unsupported"} | ${result.selectedTests.length} | ${Math.round(result.durationMs / 1000)}s |`,
);
const markdown = [
  "# Generated benchmark results",
  "",
  `Generated from ${results.length} recorded runs. Unsupported and inconclusive results are retained.`,
  "",
  "| Case | Mode | Actual status | Selected tests | Duration |",
  "| --- | --- | --- | ---: | ---: |",
  ...rows,
  "",
].join("\n");
await writeFile(join(root, "benchmarks", "RESULTS.md"), markdown, "utf8");

const pagePath = join(root, "docs", "benchmarks", "index.md");
const page = await readFile(pagePath, "utf8");
const summary = results.length
  ? [
      "| Case | Mode | Status | Tests |",
      "| --- | --- | --- | ---: |",
      ...results.map(
        (result) =>
          `| ${result.id} | ${result.mode} | ${result.actualStatus ?? "unsupported"} | ${result.selectedTests.length} |`,
      ),
    ].join("\n")
  : "No benchmark runs have been recorded yet.";
await writeFile(
  pagePath,
  page.replace(
    /<!-- benchmark-summary:start -->[\s\S]*<!-- benchmark-summary:end -->/,
    `<!-- benchmark-summary:start -->\n\n${summary}\n\n<!-- benchmark-summary:end -->`,
  ),
  "utf8",
);
