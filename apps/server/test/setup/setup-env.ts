import "reflect-metadata";

import { applyTestEnv } from "./test-env.js";

// Runs in every test worker before any test file (and therefore the app) loads.
applyTestEnv();
