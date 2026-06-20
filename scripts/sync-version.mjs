import { readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(await readFile(join(root, "version.json"), "utf8"));
const version = manifest.version;
if (typeof version !== "string" || !/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error("version.json contains an invalid version.");
}

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
  const path = join(root, relativePath);
  const packageJson = JSON.parse(await readFile(path, "utf8"));
  packageJson.version = version;
  await writeFile(path, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");
}

await writeFile(
  join(root, "packages/adapter-api/src/version.generated.ts"),
  `// Generated from /version.json by scripts/sync-version.mjs. Do not edit directly.\nexport const TOOL_VERSION = ${JSON.stringify(version)} as const;\n`,
  "utf8",
);
