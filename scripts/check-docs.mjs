import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const ignored = new Set(["node_modules", ".git", "dist", "coverage", "artifacts"]);
const markdown = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.name.endsWith(".md")) markdown.push(path);
  }
}

await walk(root);
const failures = [];
for (const file of markdown) {
  const text = await readFile(file, "utf8");
  for (const match of text.matchAll(/\[[^\]]+\]\((?!https?:|mailto:|#)([^)#]+)(?:#[^)]+)?\)/g)) {
    const target = resolve(dirname(file), decodeURIComponent(match[1]));
    try {
      await readFile(target);
    } catch {
      failures.push(`${relative(root, file)} -> ${match[1]}`);
    }
  }
}

if (failures.length) {
  console.error(`Broken documentation links:\n${failures.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Checked ${markdown.length} Markdown files.`);
}
