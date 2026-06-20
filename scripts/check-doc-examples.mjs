import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { z } from "zod";

const root = resolve(import.meta.dirname, "..");
const docs = join(root, "docs");
const files = [];

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.name.endsWith(".md")) files.push(path);
  }
}

await walk(docs);

const command = z.union([z.string().min(1), z.array(z.string()).min(1)]);
const config = z
  .object({
    version: z.literal(1),
    base: z.string().optional(),
    head: z.string().optional(),
    adapter: z.enum(["javascript", "python"]).optional(),
    projectRoot: z.string().optional(),
    execution: z
      .object({
        approved: z.boolean().optional(),
        setup: command.optional(),
        targetedTest: command.optional(),
        suite: command.optional(),
        timeoutSeconds: z.number().positive().optional(),
        suiteTimeoutSeconds: z.number().positive().optional(),
        keepWorktrees: z.boolean().optional(),
      })
      .strict()
      .optional(),
    tests: z
      .object({
        include: z.array(z.string()).optional(),
        exclude: z.array(z.string()).optional(),
        support: z.array(z.string()).optional(),
      })
      .strict()
      .optional(),
    report: z
      .object({
        format: z.enum(["text", "markdown", "json"]).optional(),
        output: z.string().nullable().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const failures = [];
for (const file of files) {
  const text = await readFile(file, "utf8");
  for (const match of text.matchAll(/```ya?ml\n([\s\S]*?)```/g)) {
    if (!/^\s*version:\s*1/m.test(match[1])) continue;
    try {
      config.parse(parseYaml(match[1]));
    } catch (error) {
      failures.push(`${file}: invalid PatchProof YAML: ${String(error)}`);
    }
  }
  for (const match of text.matchAll(/```json\n([\s\S]*?)```/g)) {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      failures.push(`${file}: invalid JSON: ${String(error)}`);
    }
  }
}

const schema = JSON.parse(await readFile(join(docs, "public", "patchproof.schema.json"), "utf8"));
if (schema.properties?.version?.const !== 1) {
  failures.push("The public configuration schema does not describe version 1.");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Validated examples in ${files.length} documentation pages.`);
}
