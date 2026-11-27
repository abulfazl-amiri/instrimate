import { randomUUID } from "node:crypto";

import jwt from "jsonwebtoken";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createVerifiedUser, expectGqlError, expectGqlOk, gql, ME } from "../helpers/api.js";
import { createTestApp, type TestApp } from "../helpers/test-app.js";

let t: TestApp;

beforeAll(async () => {
  t = await createTestApp();
});
beforeEach(async () => {
  await t.reset();
});
afterAll(async () => {
  await t?.close();
});

function sign(payload: object, options: jwt.SignOptions = {}, secret = process.env.JWT_SECRET!) {
  return jwt.sign(payload, secret, { algorithm: "HS256", expiresIn: "15m", ...options });
}

describe("public operations", () => {
  it("answers health without a token", async () => {
    const data = expectGqlOk(await gql<{ health: string }>(t, "query { health }"));
    expect(data.health).toBe("ok");
  });
});

describe("AccessTokenGuard", () => {
  it("requires the Authorization header", async () => {
    expectGqlError(await gql(t, ME), 401, "Authorization header is missing");
  });

  it.each([
    ["a non-Bearer scheme", "Basic abc"],
    ["extra parts", "Bearer abc def"],
  ])("rejects %s", async (_case, authorization) => {
    expectGqlError(await gql(t, ME, { authorization }), 401, "Malformed token is provided");
  });

  it("rejects a token that is not a JWT", async () => {
    expectGqlError(await gql(t, ME, { token: "garbage" }), 401, "Invalid token");
  });

  it("rejects a token signed with another secret", async () => {
    const user = await createVerifiedUser(t);
    const forged = sign({ sub: user.id, sid: randomUUID() }, {}, "not-the-secret");

    expectGqlError(await gql(t, ME, { token: forged }), 401, "Invalid token");
  });

  it("rejects an expired token", async () => {
    const user = await createVerifiedUser(t);
    const expired = sign({ sub: user.id, sid: randomUUID() }, { expiresIn: -10 });

    expectGqlError(await gql(t, ME, { token: expired }), 401, "Session expired");
  });

  it("rejects a token without valid sub and sid claims", async () => {
    expectGqlError(await gql(t, ME, { token: sign({ sub: "not-a-uuid" }) }), 401, "Invalid token");
  });

  it("rejects a valid signature for a session that does not exist", async () => {
    const user = await createVerifiedUser(t);
    const orphan = sign({ sub: user.id, sid: randomUUID() });

    expectGqlError(await gql(t, ME, { token: orphan }), 401, "Session is invalid or has been revoked");
  });

  it("rejects a token whose session belongs to someone else", async () => {
    const victim = await createVerifiedUser(t);
    const attacker = await createVerifiedUser(t);
    const { sid } = jwt.decode(attacker.accessToken) as { sid: string };

    const mixed = sign({ sub: victim.id, sid });

    expectGqlError(await gql(t, ME, { token: mixed }), 401, "Session is invalid or has been revoked");
  });

  it("blocks a user who is suspended after signing in", async () => {
    const user = await createVerifiedUser(t);
    await t.prisma.user.update({ where: { id: user.id }, data: { status: "SUSPENDED" } });

    expectGqlError(await gql(t, ME, { token: user.accessToken }), 403, "Account is not active");
  });

  it("blocks a user whose email becomes unverified after signing in", async () => {
    const user = await createVerifiedUser(t);
    await t.prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: null } });

    expectGqlError(await gql(t, ME, { token: user.accessToken }), 403, "Email must be verified");
  });
});
