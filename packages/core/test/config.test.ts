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

  it("validates and snapshots expected-failure rules", async () => {
    const root = await mkdtemp(join(tmpdir(), "patchproof-config-"));
    await writeFile(
      join(root, ".patchproof.yml"),
      [
        "version: 1",
        "tests:",
        "  expectedFailures:",
        "    'tests/value.test.ts::rejects negative values':",
        "      type: AssertionError",
        "      message: expected rejection",
        "      contains: rejection",
      ].join("\n"),
    );
    const { config } = await loadConfig(root, undefined, {});
    expect(config.tests.expectedFailures["tests/value.test.ts::rejects negative values"]).toEqual({
      type: "AssertionError",
      message: "expected rejection",
      contains: "rejection",
    });
    expect(
      Object.isFrozen(
        config.tests.expectedFailures["tests/value.test.ts::rejects negative values"],
      ),
    ).toBe(true);
  });

  it("rejects unsafe expected-failure reason text", async () => {
    const root = await mkdtemp(join(tmpdir(), "patchproof-config-"));
    await writeFile(
      join(root, ".patchproof.yml"),
      "version: 1\ntests:\n  expectedFailures:\n    test-id:\n      type: AssertionError\n      message: '[REDACTED]'\n",
    );
    await expect(loadConfig(root, undefined, {})).rejects.toThrow(/redaction/i);
  });
});
