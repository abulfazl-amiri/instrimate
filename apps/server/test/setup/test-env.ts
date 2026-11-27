import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { parse } from "dotenv";

export const serverRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const TEST_REDIS_DB = "15";

/**
 * Settings the app reads from `process.env`. They are applied before the app
 * is imported, because some services read their limits at module load time.
 * Values here always win over whatever is in the shell or `.env`, so a run is
 * reproducible on every machine.
 */
const fixedEnv: Record<string, string> = {
  NODE_ENV: "test",
  JWT_SECRET: "integration-test-secret",
  JWT_EXPIRES_IN: "15m",
  REFRESH_TOKEN_EXPIRES_IN: "7d",
  RESET_TOKEN_EXPIRES_IN: "15m",
  SUDO_TOKEN_EXPIRES_IN: "10m",
  EMAIL_VERIFICATION_CODE_TTL_SECONDS: "600",
  EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS: "60",
  EMAIL_VERIFICATION_MAX_ATTEMPTS: "3",
  PASSWORD_RESET_REQUEST_COOLDOWN_SECONDS: "60",
  // Email is replaced by an in-memory inbox in tests; these only keep the
  // real EmailService constructor happy if it is ever instantiated.
  EMAIL_PROVIDER: "smtp",
  EMAIL_SMTP_HOST: "127.0.0.1",
  EMAIL_SMTP_PORT: "1025",
  EMAIL_SMTP_SECURE: "false",
  CLIENT_URL: "http://127.0.0.1:3000",
  CORS_ORIGINS: "http://127.0.0.1:3000",
};

function readDotEnv(): Record<string, string> {
  const path = join(serverRoot, ".env");
  return existsSync(path) ? parse(readFileSync(path)) : {};
}

/** `postgresql://.../instrimate?x` -> `postgresql://.../instrimate_test?x` */
function toTestDatabaseUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  const name = url.pathname.replace(/^\//, "");
  if (!name.endsWith("_test")) url.pathname = `/${name}_test`;
  return url.toString();
}

/** `redis://host:6378` -> `redis://host:6378/15` */
function toTestRedisUrl(redisUrl: string): string {
  const url = new URL(redisUrl);
  url.pathname = `/${TEST_REDIS_DB}`;
  return url.toString();
}

function resolveDatabaseUrl(dotEnv: Record<string, string>): string {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  if (dotEnv.DATABASE_URL) return toTestDatabaseUrl(dotEnv.DATABASE_URL);
  throw new Error(
    "Set TEST_DATABASE_URL, or create apps/server/.env with DATABASE_URL " +
      "(the tests use the same server with a `_test` database).",
  );
}

function resolveRedisUrl(dotEnv: Record<string, string>): string {
  if (process.env.TEST_REDIS_URL) return process.env.TEST_REDIS_URL;
  if (dotEnv.REDIS_URL) return toTestRedisUrl(dotEnv.REDIS_URL);
  return `redis://127.0.0.1:6378/${TEST_REDIS_DB}`;
}

/**
 * The suite wipes every table and the whole Redis database between tests, so
 * refuse to run against anything that does not look like a test target.
 */
function assertSafeTargets(databaseUrl: string, redisUrl: string): void {
  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");
  if (!databaseName.endsWith("_test")) {
    throw new Error(
      `Refusing to run integration tests against database "${databaseName}": ` +
        "its name must end with `_test`.",
    );
  }

  const redisDb = new URL(redisUrl).pathname.replace(/^\//, "");
  if (!/^\d+$/.test(redisDb) || redisDb === "0") {
    throw new Error(
      `Refusing to run integration tests against Redis "${redisUrl}": ` +
        "use an explicit, non-zero database index such as /15.",
    );
  }
}

export function applyTestEnv(): void {
  const dotEnv = readDotEnv();
  const databaseUrl = resolveDatabaseUrl(dotEnv);
  const redisUrl = resolveRedisUrl(dotEnv);
  assertSafeTargets(databaseUrl, redisUrl);

  Object.assign(process.env, fixedEnv, {
    DATABASE_URL: databaseUrl,
    REDIS_URL: redisUrl,
  });
}
