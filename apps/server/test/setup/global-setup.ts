import { execFileSync } from "node:child_process";
import { join } from "node:path";

import { applyTestEnv, serverRoot } from "./test-env.js";

/** Runs once per test run: recreate the test database from the Prisma schema. */
export default function setup(): void {
  applyTestEnv();

  execFileSync(
    join(serverRoot, "node_modules", ".bin", "prisma"),
    ["db", "push", "--force-reset", "--accept-data-loss"],
    { cwd: serverRoot, env: process.env, stdio: "inherit" },
  );
}
