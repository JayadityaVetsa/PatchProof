import { spawn } from "node:child_process";
import process from "node:process";
import type { CommandSpec, RawProcessResult } from "@patchproof/adapter-api";

export interface RunCommandOptions {
  readonly cwd: string;
  readonly timeoutMs: number;
  readonly maxOutputBytes?: number;
  readonly env?: NodeJS.ProcessEnv;
  readonly signal?: AbortSignal | undefined;
  readonly redactions?: readonly string[];
}

function neutralizeWorkflowCommands(value: string): string {
  return value
    .split(/\r?\n/)
    .map((line) => (line.startsWith("::") ? `\u200b${line}` : line))
    .join("\n");
}

function redact(value: string, patterns: readonly string[]): string {
  let result = value;
  for (const pattern of patterns) {
    if (pattern) result = result.split(pattern).join("[REDACTED]");
  }
  return neutralizeWorkflowCommands(result);
}

async function terminateTree(pid: number): Promise<void> {
  if (process.platform === "win32") {
    await new Promise<void>((resolve) => {
      const child = spawn("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
      child.once("close", () => resolve());
      child.once("error", () => resolve());
    });
    return;
  }
  try {
    process.kill(-pid, "SIGTERM");
    await new Promise((resolve) => setTimeout(resolve, 750));
    process.kill(-pid, "SIGKILL");
  } catch {
    // Process already exited.
  }
}

export async function runCommand(
  command: CommandSpec,
  options: RunCommandOptions,
): Promise<RawProcessResult & { readonly truncated: boolean }> {
  const max = options.maxOutputBytes ?? 256_000;
  const shell = command.shell !== undefined;
  const executable = shell
    ? process.platform === "win32"
      ? (process.env.ComSpec ?? "cmd.exe")
      : (process.env.SHELL ?? "/bin/sh")
    : command.executable;
  const args = shell
    ? process.platform === "win32"
      ? ["/d", "/s", "/c", command.shell!]
      : ["-c", command.shell!]
    : [...(command.args ?? [])];
  if (!executable) throw new Error("Command has no executable.");

  return await new Promise((resolve, reject) => {
    let stdout: Buffer<ArrayBufferLike> = Buffer.alloc(0);
    let stderr: Buffer<ArrayBufferLike> = Buffer.alloc(0);
    let truncated = false;
    let timedOut = false;
    let interrupted = false;
    let settled = false;
    const child = spawn(executable, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      windowsHide: true,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const append = (
      current: Buffer<ArrayBufferLike>,
      chunk: Buffer<ArrayBufferLike>,
    ): Buffer<ArrayBufferLike> => {
      if (current.length >= max) {
        truncated = true;
        return current;
      }
      const remaining = max - current.length;
      if (chunk.length > remaining) truncated = true;
      return Buffer.concat([current, chunk.subarray(0, remaining)]);
    };
    child.stdout.on("data", (chunk: Buffer) => {
      stdout = append(stdout, chunk);
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = append(stderr, chunk);
    });

    const stop = (reason: "timeout" | "interrupted") => {
      if (reason === "timeout") timedOut = true;
      else interrupted = true;
      child.kill("SIGKILL");
      if (child.pid) void terminateTree(child.pid);
    };
    const timer = setTimeout(() => stop("timeout"), options.timeoutMs);
    const abort = () => stop("interrupted");
    options.signal?.addEventListener("abort", abort, { once: true });

    child.once("error", (error) => {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
      if (!settled) {
        settled = true;
        reject(error);
      }
    });
    child.once("close", (exitCode, signal) => {
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
      if (settled) return;
      settled = true;
      const redactions = options.redactions ?? [];
      resolve({
        exitCode,
        signal,
        stdout: redact(stdout.toString("utf8"), redactions),
        stderr: redact(stderr.toString("utf8"), redactions),
        timedOut,
        interrupted,
        truncated,
      });
    });
  });
}

export function normalizeGeneric(
  result: RawProcessResult,
): "pass" | "infrastructure_failure" | "timeout" | "interrupted" {
  if (result.interrupted) return "interrupted";
  if (result.timedOut) return "timeout";
  return result.exitCode === 0 ? "pass" : "infrastructure_failure";
}
