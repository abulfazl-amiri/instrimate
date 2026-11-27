import swc from "unplugin-swc";
import { defineConfig } from "vitest/config";

export default defineConfig({
  // NestJS dependency injection needs decorator metadata, which Vitest's
  // default transformer (esbuild) does not emit. SWC does.
  plugins: [swc.vite({ module: { type: "es6" } })],
  test: {
    include: ["test/**/*.test.ts"],
    globalSetup: ["test/setup/global-setup.ts"],
    setupFiles: ["test/setup/setup-env.ts"],
    // All files share one Postgres database and one Redis index.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
  },
});
