import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["cjs"],
  platform: "node",
  target: "node22",
  bundle: true,
  noExternal: [/.*/],
  minify: true,
  sourcemap: true,
  clean: true,
  outDir: "dist",
  outExtension: () => ({ js: ".cjs" }),
});
