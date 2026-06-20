import { rm } from "node:fs/promises";
import { resolve } from "node:path";

await rm(resolve(import.meta.dirname, "..", "LICENSE"), { force: true });
