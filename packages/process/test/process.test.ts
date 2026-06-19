import process from "node:process";
import { describe, expect, it } from "vitest";
import { runCommand } from "../src/index.js";

describe("process runner", () => {
  it("captures and redacts bounded output", async () => {
    const result = await runCommand(
      {
        executable: process.execPath,
        args: ["-e", "console.log('secret-value'); console.log('::error::unsafe')"],
        display: "node fixture",
      },
      {
        cwd: process.cwd(),
        timeoutMs: 5_000,
        redactions: ["secret-value"],
      },
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("[REDACTED]");
    expect(result.stdout).not.toContain("\n::error");
  });

  it("times out a long process", async () => {
    const result = await runCommand(
      {
        executable: process.execPath,
        args: ["-e", "setTimeout(() => {}, 10000)"],
        display: "node timeout",
      },
      { cwd: process.cwd(), timeoutMs: 50 },
    );
    expect(result.timedOut).toBe(true);
  });
});
