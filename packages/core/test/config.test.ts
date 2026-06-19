import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/index.js";

describe("configuration", () => {
  it("applies CLI overrides above YAML", async () => {
    const root = await mkdtemp(join(tmpdir(), "patchproof-config-"));
    await writeFile(
      join(root, ".patchproof.yml"),
      "version: 1\nbase: main\nadapter: python\nexecution:\n  timeoutSeconds: 30\n",
    );
    const { config } = await loadConfig(root, undefined, {
      base: "release",
      adapter: "javascript",
      timeoutSeconds: 45,
    });
    expect(config.base).toBe("release");
    expect(config.adapter).toBe("javascript");
    expect(config.execution.timeoutSeconds).toBe(45);
  });

  it("rejects unknown keys", async () => {
    const root = await mkdtemp(join(tmpdir(), "patchproof-config-"));
    await writeFile(join(root, ".patchproof.yml"), "version: 1\nsurprise: true\n");
    await expect(loadConfig(root, undefined, {})).rejects.toThrow();
  });

  it("rejects project roots that escape the repository", async () => {
    const root = await mkdtemp(join(tmpdir(), "patchproof-config-"));
    await expect(loadConfig(root, undefined, { projectRoot: "../outside" })).rejects.toThrow(
      /projectRoot/,
    );
  });
});
