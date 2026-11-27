import request from "supertest";
import type { Response } from "supertest";
import { expect } from "vitest";

import type { TestApp } from "./test-app.js";

export const AUTH = "/api/v1/auth";
export const DEFAULT_PASSWORD = "correct-horse-battery";

let emailCounter = 0;

/** A unique, lowercase email for each call. */
export function uniqueEmail(prefix = "teacher"): string {
  emailCounter += 1;
  return `${prefix}-${emailCounter}-${Date.now()}@example.com`;
}

// ---------------------------------------------------------------------------
// Cookies

type ParsedCookie = { name: string; value: string; attributes: string[]; raw: string };

function parseSetCookies(res: Response): ParsedCookie[] {
  const header = res.headers["set-cookie"] as string[] | string | undefined;
  const raw = header === undefined ? [] : Array.isArray(header) ? header : [header];
  return raw.map((line) => {
    const [pair = "", ...attributes] = line.split(";").map((part) => part.trim());
    const separator = pair.indexOf("=");
    return {
      name: pair.slice(0, separator),
      value: decodeURIComponent(pair.slice(separator + 1)),
      attributes: attributes.map((attribute) => attribute.toLowerCase()),
      raw: line,
    };
  });
}

export function getSetCookie(res: Response, name: string): ParsedCookie | undefined {
  return parseSetCookies(res).find((cookie) => cookie.name === name);
}

/** The value of a cookie the response set, failing the test if it is missing. */
export function cookieValue(res: Response, name: string): string {
  const cookie = getSetCookie(res, name);
  expect(cookie, `expected response to set the ${name} cookie`).toBeDefined();
  expect(cookie!.value).not.toBe("");
  return cookie!.value;
}

/** True if the response clears the cookie (empty value, expiry in the past). */
export function clearsCookie(res: Response, name: string): boolean {
  const cookie = getSetCookie(res, name);
  return (
    cookie !== undefined &&
    cookie.value === "" &&
    cookie.attributes.some((attribute) => attribute.startsWith("expires=thu, 01 jan 1970"))
  );
}

export function cookieHeader(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join("; ");
}

// ---------------------------------------------------------------------------
// REST auth

export type Credentials = { name: string; email: string; password: string };

export type SignedInUser = Credentials & {
  id: string;
  accessToken: string;
  refreshToken: string;
};

export function post(t: TestApp, path: string, body?: object, cookies?: Record<string, string>) {
  const req = request(t.http).post(path);
  if (cookies) req.set("Cookie", cookieHeader(cookies));
  return body === undefined ? req : req.send(body);
}

export function signup(t: TestApp, overrides: Partial<Credentials> = {}) {
  const credentials: Credentials = {
    name: "Test Teacher",
    email: uniqueEmail(),
    password: DEFAULT_PASSWORD,
    ...overrides,
  };
  return { credentials, response: post(t, `${AUTH}/signup`, credentials) };
}

export function signin(
  t: TestApp,
  email: string,
  password: string,
  userAgent = "integration-tests",
) {
  return request(t.http)
    .post(`${AUTH}/signin`)
    .set("User-Agent", userAgent)
    .send({ email, password });
}

/** Signs a user up, verifies their email and returns their first session. */
export async function createVerifiedUser(
  t: TestApp,
  overrides: Partial<Credentials> = {},
): Promise<SignedInUser> {
  const { credentials, response } = signup(t, overrides);
  expect((await response).status).toBe(200);

  const code = t.inbox.verificationCode(credentials.email);
  const verified = await post(t, `${AUTH}/verify-email`, { email: credentials.email, code });
  expect(verified.status).toBe(200);

  const user = await t.prisma.user.findUniqueOrThrow({ where: { email: credentials.email } });
  return {
    ...credentials,
    id: user.id,
    accessToken: verified.body.token as string,
    refreshToken: cookieValue(verified, "refreshToken"),
  };
}

/** A verified user promoted to ADMIN. The guard reads the role on each request. */
export async function createAdmin(t: TestApp): Promise<SignedInUser> {
  const admin = await createVerifiedUser(t, { name: "Admin", email: uniqueEmail("admin") });
  await t.prisma.user.update({ where: { id: admin.id }, data: { role: "ADMIN" } });
  return admin;
}

/** A fresh session for an existing user. */
export async function signInAgain(
  t: TestApp,
  user: Credentials,
  userAgent?: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await signin(t, user.email, user.password, userAgent);
  expect(res.status).toBe(200);
  return { accessToken: res.body.token as string, refreshToken: cookieValue(res, "refreshToken") };
}

// ---------------------------------------------------------------------------
// GraphQL

type GqlOptions = {
  variables?: Record<string, unknown>;
  token?: string;
  authorization?: string;
  cookies?: Record<string, string>;
};

type GqlError = {
  message: string;
  extensions?: { code?: string; statusCode?: number };
};

export type GqlResult<T> = {
  response: Response;
  data: T | null | undefined;
  errors: GqlError[] | undefined;
};

export async function gql<T = Record<string, unknown>>(
  t: TestApp,
  query: string,
  options: GqlOptions = {},
): Promise<GqlResult<T>> {
  const req = request(t.http).post("/graphql");
  const authorization = options.authorization ?? (options.token && `Bearer ${options.token}`);
  if (authorization) req.set("Authorization", authorization);
  if (options.cookies) req.set("Cookie", cookieHeader(options.cookies));

  const response = await req.send({ query, variables: options.variables ?? {} });
  return { response, data: response.body.data, errors: response.body.errors };
}

/** Assert the operation failed with the given HTTP-style status from the API error filter. */
export function expectGqlError(
  result: GqlResult<unknown>,
  statusCode: number,
  message?: string | RegExp,
): void {
  expect(result.errors, "expected a GraphQL error").toBeDefined();
  const [error] = result.errors!;
  expect(error!.extensions?.statusCode).toBe(statusCode);
  if (message !== undefined) expect(error!.message).toMatch(message);
}

export function expectGqlOk<T>(result: GqlResult<T>): T {
  expect(result.errors, JSON.stringify(result.errors)).toBeUndefined();
  return result.data as T;
}

export const ME = /* GraphQL */ `
  query {
    me {
      id
      name
      email
      role
      status
      emailVerifiedAt
    }
  }
`;
