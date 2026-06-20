import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import { promisify } from "node:util";

const exec = promisify(execFile);
const runTool = (name, args, options) =>
  process.platform === "win32"
    ? exec(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", `${name}.cmd`, ...args], options)
    : exec(name, args, options);
const root = resolve(import.meta.dirname, "..");
const release = JSON.parse(await readFile(join(root, "version.json"), "utf8"));
const expectedTarball = `jayadityavetsa-patchproof-${release.version}.tgz`;
const artifacts = join(root, "artifacts");
await mkdir(artifacts, { recursive: true });
await runTool("corepack", ["pnpm", "check"], { cwd: root, windowsHide: true });
for (const name of await readdir(artifacts)) {
  if (name.endsWith(".tgz")) await rm(join(artifacts, name));
}
await runTool("corepack", ["pnpm", "pack:cli"], { cwd: root, windowsHide: true });
const tarballName = (await readdir(artifacts))
  .filter((name) => name === expectedTarball)
  .sort()
  .at(-1);
if (!tarballName) throw new Error("No tarball found.");
const tarball = join(artifacts, tarballName);
const { stdout: listing } = await exec("tar", ["-tf", tarball], {
  cwd: root,
  encoding: "utf8",
});
const files = listing.trim().split(/\r?\n/);
const allowed = new Set([
  "package/dist/cli.cjs",
  "package/LICENSE",
  "package/package.json",
  "package/README.md",
]);
for (const file of files) {
  if (!allowed.has(file)) throw new Error(`Unexpected tarball file: ${file}`);
}
const { stdout: packageJsonText } = await exec("tar", ["-xOf", tarball, "package/package.json"], {
  cwd: root,
  encoding: "utf8",
  maxBuffer: 5 * 1024 * 1024,
});
const metadata = JSON.parse(packageJsonText);
if (metadata.name !== "@jayadityavetsa/patchproof" || metadata.version !== release.version) {
  throw new Error("Tarball package identity does not match the alpha release.");
}
for (const file of files) {
  const { stdout } = await exec("tar", ["-xOf", tarball, file], {
    cwd: root,
    encoding: "buffer",
    maxBuffer: 10 * 1024 * 1024,
  });
  const text = stdout.toString("utf8");
  for (const forbidden of [root, homedir(), "npm_", "gho_", "github_pat_"]) {
    if (forbidden && text.includes(forbidden)) {
      throw new Error(`Sensitive/local value found in ${file}: ${forbidden}`);
    }
  }
}
const bytes = await readFile(tarball);
const sha256 = createHash("sha256").update(bytes).digest("hex");
await writeFile(join(artifacts, "SHA256SUMS"), `${sha256}  ${basename(tarball)}\n`, "utf8");
const sbom = {
  bomFormat: "CycloneDX",
  specVersion: "1.6",
  serialNumber: `urn:uuid:${sha256.slice(0, 8)}-${sha256.slice(8, 12)}-4${sha256.slice(13, 16)}-a${sha256.slice(17, 20)}-${sha256.slice(20, 32)}`,
  version: 1,
  metadata: {
    component: {
      type: "application",
      "bom-ref": `pkg:npm/%40jayadityavetsa/patchproof@${metadata.version}`,
      group: "@jayadityavetsa",
      name: "patchproof",
      version: metadata.version,
      licenses: [{ license: { id: "Apache-2.0" } }],
      purl: `pkg:npm/%40jayadityavetsa/patchproof@${metadata.version}`,
      hashes: [{ alg: "SHA-256", content: sha256 }],
    },
  },
  components: [],
  dependencies: [
    {
      ref: `pkg:npm/%40jayadityavetsa/patchproof@${metadata.version}`,
      dependsOn: [],
    },
  ],
};
await writeFile(
  join(artifacts, "patchproof-sbom.cdx.json"),
  `${JSON.stringify(sbom, null, 2)}\n`,
  "utf8",
);
console.log(`Release verification passed for ${tarballName}`);
