import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const runTool = (name, args, options) =>
  process.platform === "win32"
    ? exec(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", `${name}.cmd`, ...args], options)
    : exec(name, args, options);
const runExecutable = (file, args, options) =>
  process.platform === "win32"
    ? exec(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", "call", file, ...args], options)
    : exec(file, args, options);
const root = resolve(import.meta.dirname, "..");
const { version: releaseVersion } = JSON.parse(await readFile(join(root, "version.json"), "utf8"));
const expectedTarball = `jayadityavetsa-patchproof-${releaseVersion}.tgz`;
const artifacts = join(root, "artifacts");
await mkdir(artifacts, { recursive: true });
for (const name of await readdir(artifacts)) {
  if (name.endsWith(".tgz")) await rm(join(artifacts, name));
}
await runTool("corepack", ["pnpm", "build"], { cwd: root, windowsHide: true });
await runTool("corepack", ["pnpm", "pack:cli"], { cwd: root, windowsHide: true });
const tarballName = (await readdir(artifacts))
  .filter((name) => name === expectedTarball)
  .sort()
  .at(-1);
if (!tarballName) throw new Error("No CLI tarball was produced.");
const tarball = join(artifacts, tarballName);
const installRoot = await mkdtemp(join(tmpdir(), "PatchProof acceptance with spaces "));
const prefix = join(installRoot, "global prefix");
const cache = join(installRoot, "npm cache");
await runTool(
  "npm",
  [
    "install",
    "--global",
    "--offline",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--prefix",
    prefix,
    tarball,
  ],
  { cwd: installRoot, env: { ...process.env, npm_config_cache: cache }, windowsHide: true },
);
const executable =
  process.platform === "win32" ? join(prefix, "patchproof.cmd") : join(prefix, "bin", "patchproof");
const { stdout: versionOutput } = await runExecutable(executable, ["--version"], {
  cwd: installRoot,
  windowsHide: true,
});
if (versionOutput.trim() !== releaseVersion) {
  throw new Error(`Unexpected installed version: ${versionOutput}`);
}
await exec("node", [join(root, "scripts", "acceptance.mjs"), executable], {
  cwd: root,
  windowsHide: true,
});
console.log(`Package acceptance passed: ${tarball}`);
