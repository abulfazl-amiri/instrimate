import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  AUTH,
  clearsCookie,
  cookieValue,
  createVerifiedUser,
  expectGqlError,
  expectGqlOk,
  gql,
  ME,
  post,
  signin,
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

const MY_SESSIONS = /* GraphQL */ `
  query {
    mySessions {
      sessionId
      current
    }
  }
`;

describe("POST /auth/signin", () => {
  it("returns an access token and sets the refresh cookie", async () => {
    const user = await createVerifiedUser(t);

    const res = await signin(t, user.email, user.password);

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    cookieValue(res, "refreshToken");
    expectGqlOk(await gql(t, ME, { token: res.body.token }));
  });

  it("accepts the email in any case", async () => {
    const user = await createVerifiedUser(t);

    const res = await signin(t, user.email.toUpperCase(), user.password);

    expect(res.status).toBe(200);
  });

  it("gives the same error for a wrong password and an unknown email", async () => {
    const user = await createVerifiedUser(t);

    const wrongPassword = await signin(t, user.email, "wrong-password");
    const unknownEmail = await signin(t, uniqueEmail(), user.password);

    for (const res of [wrongPassword, unknownEmail]) {
      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Email or password was incorrect");
      expect(res.headers["set-cookie"]).toBeUndefined();
    }
  });

  it("refuses an account whose email is not verified", async () => {
    const { credentials, response } = signup(t);
    await response;

    const res = await signin(t, credentials.email, credentials.password);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Email must be verified before signing in");
  });

  it("refuses a suspended account", async () => {
    const user = await createVerifiedUser(t);
    await t.prisma.user.update({ where: { id: user.id }, data: { status: "SUSPENDED" } });

    const res = await signin(t, user.email, user.password);

    expect(res.status).toBe(403);
    expect(res.body.message).toBe("Account is not active");
  });

  it("rejects a malformed body with 422", async () => {
    const res = await post(t, `${AUTH}/signin`, { email: "nope" });

    expect(res.status).toBe(422);
  });
});

describe("POST /auth/refresh", () => {
  it("requires the refresh cookie", async () => {
    const res = await post(t, `${AUTH}/refresh`);

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Refresh token must be provided in the cookies");
  });

  it("rotates the refresh token and keeps the same session", async () => {
    const user = await createVerifiedUser(t);

    const res = await post(t, `${AUTH}/refresh`, undefined, { refreshToken: user.refreshToken });

    expect(res.status).toBe(200);
    const newRefreshToken = cookieValue(res, "refreshToken");
    expect(newRefreshToken).not.toBe(user.refreshToken);

    const sessions = expectGqlOk(
      await gql<{ mySessions: Array<{ current: boolean }> }>(t, MY_SESSIONS, {
        token: res.body.token,
      }),
    );
    expect(sessions.mySessions).toEqual([expect.objectContaining({ current: true })]);
  });

  it("does not accept a refresh token twice", async () => {
    const user = await createVerifiedUser(t);
    const first = await post(t, `${AUTH}/refresh`, undefined, { refreshToken: user.refreshToken });
    expect(first.status).toBe(200);

    const replay = await post(t, `${AUTH}/refresh`, undefined, { refreshToken: user.refreshToken });

    expect(replay.status).toBe(401);
    expect(replay.body.message).toBe("Invalid or expired session");
  });

  it("rejects an unknown refresh token", async () => {
    const res = await post(t, `${AUTH}/refresh`, undefined, { refreshToken: "made-up" });

    expect(res.status).toBe(401);
  });

  it("refuses to refresh a suspended account", async () => {
    const user = await createVerifiedUser(t);
    await t.prisma.user.update({ where: { id: user.id }, data: { status: "SUSPENDED" } });

    const res = await post(t, `${AUTH}/refresh`, undefined, { refreshToken: user.refreshToken });

    expect(res.status).toBe(403);
  });
});

describe("POST /auth/logout", () => {
  it("ends the session and clears the cookies", async () => {
    const user = await createVerifiedUser(t);

    const res = await post(t, `${AUTH}/logout`, undefined, { refreshToken: user.refreshToken });

    expect(res.status).toBe(204);
    expect(clearsCookie(res, "refreshToken")).toBe(true);
    expect(clearsCookie(res, "sudoToken")).toBe(true);

    const refresh = await post(t, `${AUTH}/refresh`, undefined, {
      refreshToken: user.refreshToken,
    });
    expect(refresh.status).toBe(401);

    // The access token belongs to the ended session, so it stops working too.
    expectGqlError(await gql(t, ME, { token: user.accessToken }), 401);
  });

  it("requires the refresh cookie", async () => {
    const res = await post(t, `${AUTH}/logout`);

    expect(res.status).toBe(401);
  });
});
