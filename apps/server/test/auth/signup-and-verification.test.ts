import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  AUTH,
  cookieValue,
  expectGqlOk,
  getSetCookie,
  gql,
  ME,
  post,
  signup,
  uniqueEmail,
} from "../helpers/api.js";
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

describe("POST /auth/signup", () => {
  it("creates an unverified teacher and emails a 6-digit code", async () => {
    const { credentials, response } = signup(t);
    const res = await response;

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Check your inbox for a verification code" });

    const user = await t.prisma.user.findUniqueOrThrow({ where: { email: credentials.email } });
    expect(user).toMatchObject({ name: credentials.name, role: "TEACHER", status: "ACTIVE" });
    expect(user.emailVerifiedAt).toBeNull();
    expect(user.passwordHash).not.toContain(credentials.password);

    expect(t.inbox.sentTo(credentials.email)).toHaveLength(1);
    expect(t.inbox.verificationCode(credentials.email)).toMatch(/^\d{6}$/);
  });

  it("stores the email in lowercase", async () => {
    const email = uniqueEmail();
    const res = await signup(t, { email: email.toUpperCase() }).response;

    expect(res.status).toBe(200);
    await expect(t.prisma.user.findUnique({ where: { email } })).resolves.not.toBeNull();
  });

  it("rejects an email that is already registered, ignoring case", async () => {
    const { credentials, response } = signup(t);
    await response;

    const res = await signup(t, { email: credentials.email.toUpperCase() }).response;

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({ message: "Email is already in use", errorCode: "CONFLICT" });
    await expect(t.prisma.user.count()).resolves.toBe(1);
  });

  it.each([
    ["an invalid email", { email: "not-an-email" }],
    ["a short password", { password: "short" }],
    ["a name over 50 chars", { name: "x".repeat(51) }],
  ])("rejects %s with 422 and creates nothing", async (_case, overrides) => {
    const res = await signup(t, overrides).response;

    expect(res.status).toBe(422);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
    await expect(t.prisma.user.count()).resolves.toBe(0);
    expect(t.inbox.sent).toHaveLength(0);
  });

  it("returns 503 when the email can't be sent, and lets the user request a new code", async () => {
    t.inbox.failNext();
    const { credentials, response } = signup(t);

    const res = await response;
    expect(res.status).toBe(503);
    expect(t.inbox.sent).toHaveLength(0);

    // The failed send must release the resend cooldown.
    const resend = await post(t, `${AUTH}/resend-verification`, { email: credentials.email });
    expect(resend.status).toBe(200);
    expect(t.inbox.verificationCode(credentials.email)).toMatch(/^\d{6}$/);
  });
});

describe("POST /auth/verify-email", () => {
  async function signedUp() {
    const { credentials, response } = signup(t);
    expect((await response).status).toBe(200);
    return { ...credentials, code: t.inbox.verificationCode(credentials.email) };
  }

  it("verifies the email and starts a session", async () => {
    const user = await signedUp();

    const res = await post(t, `${AUTH}/verify-email`, { email: user.email, code: user.code });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));

    const cookie = getSetCookie(res, "refreshToken");
    expect(cookie?.value).toBeTruthy();
    expect(cookie?.attributes).toEqual(
      expect.arrayContaining(["httponly", "secure", "samesite=strict"]),
    );

    const stored = await t.prisma.user.findUniqueOrThrow({ where: { email: user.email } });
    expect(stored.emailVerifiedAt).toBeInstanceOf(Date);

    const me = expectGqlOk(await gql<{ me: { email: string } }>(t, ME, { token: res.body.token }));
    expect(me.me.email).toBe(user.email);
  });

  it("rejects a wrong code", async () => {
    const user = await signedUp();
    const wrong = user.code === "000000" ? "111111" : "000000";

    const res = await post(t, `${AUTH}/verify-email`, { email: user.email, code: wrong });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid or expired verification code");
  });

  it("locks the code after the maximum number of attempts", async () => {
    const user = await signedUp();
    const wrong = user.code === "000000" ? "111111" : "000000";

    // EMAIL_VERIFICATION_MAX_ATTEMPTS is 3 in the test environment.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const res = await post(t, `${AUTH}/verify-email`, { email: user.email, code: wrong });
      expect(res.status).toBe(401);
    }

    const res = await post(t, `${AUTH}/verify-email`, { email: user.email, code: user.code });
    expect(res.status).toBe(401);
    const stored = await t.prisma.user.findUniqueOrThrow({ where: { email: user.email } });
    expect(stored.emailVerifiedAt).toBeNull();
  });

  it("does not accept the same code twice", async () => {
    const user = await signedUp();
    const first = await post(t, `${AUTH}/verify-email`, user);
    expect(first.status).toBe(200);

    const second = await post(t, `${AUTH}/verify-email`, user);
    expect(second.status).toBe(401);
  });

  it("rejects a code that is not 6 digits with 422", async () => {
    const user = await signedUp();

    const res = await post(t, `${AUTH}/verify-email`, { email: user.email, code: "12ab" });

    expect(res.status).toBe(422);
  });

  it("gives the same answer for an unknown email", async () => {
    const res = await post(t, `${AUTH}/verify-email`, {
      email: uniqueEmail(),
      code: "123456",
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid or expired verification code");
  });
});

describe("POST /auth/resend-verification", () => {
  it("does not send a new code during the cooldown", async () => {
    const { credentials, response } = signup(t);
    await response;

    const res = await post(t, `${AUTH}/resend-verification`, { email: credentials.email });

    expect(res.status).toBe(200);
    expect(t.inbox.sentTo(credentials.email)).toHaveLength(1);
  });

  it("sends a new code after the cooldown and invalidates the old one", async () => {
    const { credentials, response } = signup(t);
    await response;
    const oldCode = t.inbox.verificationCode(credentials.email);
    const user = await t.prisma.user.findUniqueOrThrow({ where: { email: credentials.email } });

    // Simulate the cooldown expiring.
    await t.redis.del(`email-verification-resend:${user.id}`);
    const res = await post(t, `${AUTH}/resend-verification`, { email: credentials.email });

    expect(res.status).toBe(200);
    expect(t.inbox.sentTo(credentials.email)).toHaveLength(2);
    const newCode = t.inbox.verificationCode(credentials.email);

    if (newCode !== oldCode) {
      const withOld = await post(t, `${AUTH}/verify-email`, {
        email: credentials.email,
        code: oldCode,
      });
      expect(withOld.status).toBe(401);
    }
    const withNew = await post(t, `${AUTH}/verify-email`, {
      email: credentials.email,
      code: newCode,
    });
    expect(withNew.status).toBe(200);
    cookieValue(withNew, "refreshToken");
  });

  it("does not reveal whether an account exists", async () => {
    const res = await post(t, `${AUTH}/resend-verification`, { email: uniqueEmail() });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      message: "If the account needs verification, a code has been sent",
    });
    expect(t.inbox.sent).toHaveLength(0);
  });

  it("sends nothing to an already verified account", async () => {
    const { credentials, response } = signup(t);
    await response;
    await post(t, `${AUTH}/verify-email`, {
      email: credentials.email,
      code: t.inbox.verificationCode(credentials.email),
    });
    const user = await t.prisma.user.findUniqueOrThrow({ where: { email: credentials.email } });
    await t.redis.del(`email-verification-resend:${user.id}`);

    const res = await post(t, `${AUTH}/resend-verification`, { email: credentials.email });

    expect(res.status).toBe(200);
    expect(t.inbox.sentTo(credentials.email)).toHaveLength(1);
  });
});
