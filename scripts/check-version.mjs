import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const { version } = JSON.parse(await readFile(join(root, "version.json"), "utf8"));
const packageFiles = [
  "package.json",
  "packages/adapter-api/package.json",
  "packages/adapter-javascript/package.json",
  "packages/adapter-python/package.json",
  "packages/cli/package.json",
  "packages/core/package.json",
  "packages/git/package.json",
  "packages/github-action/package.json",
  "packages/process/package.json",
  "packages/reporters/package.json",
];
for (const relativePath of packageFiles) {
  const packageJson = JSON.parse(await readFile(join(root, relativePath), "utf8"));
  if (packageJson.version !== version) {
    throw new Error(`${relativePath} has version ${packageJson.version}; expected ${version}.`);
  }
}
const generated = await readFile(
  join(root, "packages/adapter-api/src/version.generated.ts"),
  "utf8",
);
if (!generated.includes(`TOOL_VERSION = ${JSON.stringify(version)}`)) {
  throw new Error("The generated runtime version is stale. Run pnpm version:sync.");
}
