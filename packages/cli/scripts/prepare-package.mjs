import { copyFile } from "node:fs/promises";
import { resolve } from "node:path";

const packageRoot = resolve(import.meta.dirname, "..");
await copyFile(resolve(packageRoot, "..", "..", "LICENSE"), resolve(packageRoot, "LICENSE"));
