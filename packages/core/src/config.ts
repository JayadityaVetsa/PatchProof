import { access, readFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import type { AdapterName, CommandTemplate } from "@patchproof/adapter-api";
import { parse } from "yaml";
import { z } from "zod";

const commandSchema = z.union([
  z.string().trim().min(1),
  z
    .array(z.string())
    .min(1)
    .refine((items) => items[0]?.trim(), "Command executable must be non-empty.")
    .readonly(),
]);
const durationSchema = z.number().int().positive().max(86_400);
const schema = z
  .object({
    version: z.literal(1),
    base: z.string().min(1).optional(),
    head: z.string().min(1).optional(),
    adapter: z.enum(["javascript", "python"]).optional(),
    projectRoot: z.string().min(1).default("."),
    execution: z
      .object({
        approved: z.boolean().default(false),
        setup: commandSchema.optional(),
        targetedTest: commandSchema.optional(),
        suite: commandSchema.optional(),
        timeoutSeconds: durationSchema.default(120),
        suiteTimeoutSeconds: durationSchema.default(900),
        keepWorktrees: z.boolean().default(false),
      })
      .strict()
      .default({}),
    tests: z
      .object({
        include: z.array(z.string()).default([]),
        exclude: z.array(z.string()).default([]),
        support: z.array(z.string()).default([]),
      })
      .strict()
      .default({}),
    report: z
      .object({
        format: z.enum(["text", "markdown", "json"]).default("text"),
        output: z.string().nullable().default(null),
      })
      .strict()
      .default({}),
  })
  .strict();

export interface PatchProofConfig {
  readonly version: 1;
  readonly base?: string | undefined;
  readonly head?: string | undefined;
  readonly adapter?: AdapterName | undefined;
  readonly projectRoot: string;
  readonly execution: {
    readonly approved: boolean;
    readonly setup?: CommandTemplate | undefined;
    readonly targetedTest?: CommandTemplate | undefined;
    readonly suite?: CommandTemplate | undefined;
    readonly timeoutSeconds: number;
    readonly suiteTimeoutSeconds: number;
    readonly keepWorktrees: boolean;
  };
  readonly tests: {
    readonly include: readonly string[];
    readonly exclude: readonly string[];
    readonly support: readonly string[];
  };
  readonly report: {
    readonly format: "text" | "markdown" | "json";
    readonly output: string | null;
  };
}

export interface ConfigOverrides {
  readonly base?: string | undefined;
  readonly head?: string | undefined;
  readonly adapter?: AdapterName | undefined;
  readonly projectRoot?: string | undefined;
  readonly setup?: CommandTemplate | undefined;
  readonly targetedTest?: CommandTemplate | undefined;
  readonly suite?: CommandTemplate | undefined;
  readonly timeoutSeconds?: number | undefined;
  readonly format?: "text" | "markdown" | "json" | undefined;
  readonly output?: string | undefined;
  readonly approved?: boolean | undefined;
  readonly keepWorktrees?: boolean | undefined;
}

async function existing(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function findConfig(start: string): Promise<string | null> {
  let current = resolve(start);
  while (true) {
    const candidate = resolve(current, ".patchproof.yml");
    if (await existing(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

function safeProjectRoot(value: string): string {
  const normalized = value.replaceAll("\\", "/").replace(/^\.\//, "") || ".";
  if (
    isAbsolute(value) ||
    normalized === ".." ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw new Error("projectRoot must remain inside the repository.");
  }
  return normalized;
}

export async function loadConfig(
  repositoryRoot: string,
  configPath: string | undefined,
  overrides: ConfigOverrides,
): Promise<{ config: PatchProofConfig; path: string | null }> {
  const path = configPath ? resolve(repositoryRoot, configPath) : await findConfig(repositoryRoot);
  const parsed = path
    ? schema.parse(parse(await readFile(path, "utf8")))
    : schema.parse({ version: 1 });
  const envTimeout = process.env.PATCHPROOF_TIMEOUT
    ? Number(process.env.PATCHPROOF_TIMEOUT)
    : undefined;
  const config: PatchProofConfig = {
    ...parsed,
    base: overrides.base ?? process.env.PATCHPROOF_BASE ?? parsed.base,
    head: overrides.head ?? process.env.PATCHPROOF_HEAD ?? parsed.head,
    adapter: overrides.adapter ?? parsed.adapter,
    projectRoot: safeProjectRoot(overrides.projectRoot ?? parsed.projectRoot),
    execution: {
      ...parsed.execution,
      approved:
        overrides.approved ??
        (process.env.PATCHPROOF_APPROVED === "true" ? true : parsed.execution.approved),
      ...((overrides.setup ?? parsed.execution.setup) !== undefined
        ? { setup: overrides.setup ?? parsed.execution.setup }
        : {}),
      ...((overrides.targetedTest ?? parsed.execution.targetedTest) !== undefined
        ? { targetedTest: overrides.targetedTest ?? parsed.execution.targetedTest }
        : {}),
      ...((overrides.suite ?? parsed.execution.suite) !== undefined
        ? { suite: overrides.suite ?? parsed.execution.suite }
        : {}),
      timeoutSeconds: overrides.timeoutSeconds ?? envTimeout ?? parsed.execution.timeoutSeconds,
      keepWorktrees: overrides.keepWorktrees ?? parsed.execution.keepWorktrees,
    },
    report: {
      ...parsed.report,
      format: overrides.format ?? parsed.report.format,
      output: overrides.output ?? parsed.report.output,
    },
  };
  schema.parse(config);
  return { config, path };
}
