import { randomUUID } from "node:crypto";

import jwt from "jsonwebtoken";
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
  signInAgain,
  type SignedInUser,
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
      userAgent
      current
      createdAt
      lastRefreshedAt
    }
  }
`;
const REVOKE_SESSION = /* GraphQL */ `
  mutation ($sessionId: ID!) {
    revokeSession(sessionId: $sessionId) {
      sessionsRevoked
      currentSessionRevoked
    }
  }
`;
const REVOKE_SESSIONS = /* GraphQL */ `
  mutation ($includeCurrentSession: Boolean) {
    revokeSessions(includeCurrentSession: $includeCurrentSession) {
      sessionsRevoked
      currentSessionRevoked
    }
  }
`;

type Revocation = { sessionsRevoked: number; currentSessionRevoked: boolean };

function sessionIdOf(accessToken: string): string {
  return (jwt.decode(accessToken) as { sid: string }).sid;
}

async function sudoToken(user: SignedInUser, accessToken = user.accessToken): Promise<string> {
  const res = await post(t, `${AUTH}/confirm-password`, { password: user.password }).set(
    "Authorization",
    `Bearer ${accessToken}`,
  );
  expect(res.status).toBe(204);
  return cookieValue(res, "sudoToken");
}

describe("mySessions", () => {
  it("lists every session and marks the current one", async () => {
    const user = await createVerifiedUser(t);
    const laptop = await signInAgain(t, user, "laptop-browser");

    const data = expectGqlOk(
      await gql<{ mySessions: Array<{ sessionId: string; userAgent: string; current: boolean }> }>(
        t,
        MY_SESSIONS,
        { token: laptop.accessToken },
      ),
    );

    expect(data.mySessions).toHaveLength(2);
    const current = data.mySessions.filter((session) => session.current);
    expect(current).toEqual([
      expect.objectContaining({
        sessionId: sessionIdOf(laptop.accessToken),
        userAgent: "laptop-browser",
      }),
    ]);
  });

  it("does not show other users' sessions", async () => {
    const user = await createVerifiedUser(t);
    await createVerifiedUser(t);

    const data = expectGqlOk(
      await gql<{ mySessions: unknown[] }>(t, MY_SESSIONS, { token: user.accessToken }),
    );

    expect(data.mySessions).toHaveLength(1);
  });
});

describe("revokeSession", () => {
  it("requires a recent password confirmation", async () => {
    const user = await createVerifiedUser(t);
    const other = await signInAgain(t, user);

    const result = await gql(t, REVOKE_SESSION, {
      token: user.accessToken,
      variables: { sessionId: sessionIdOf(other.accessToken) },
    });

    expectGqlError(result, 401, "Recent password confirmation is required");
    expectGqlOk(await gql(t, ME, { token: other.accessToken }));
  });

  it("ends another device's session", async () => {
    const user = await createVerifiedUser(t);
    const other = await signInAgain(t, user);

    const data = expectGqlOk(
      await gql<{ revokeSession: Revocation }>(t, REVOKE_SESSION, {
        token: user.accessToken,
        cookies: { sudoToken: await sudoToken(user) },
        variables: { sessionId: sessionIdOf(other.accessToken) },
      }),
    );

    expect(data.revokeSession).toEqual({ sessionsRevoked: 1, currentSessionRevoked: false });
    expectGqlError(await gql(t, ME, { token: other.accessToken }), 401);
    const refresh = await post(t, `${AUTH}/refresh`, undefined, {
      refreshToken: other.refreshToken,
    });
    expect(refresh.status).toBe(401);
    expectGqlOk(await gql(t, ME, { token: user.accessToken }));
  });

  it("uses each sudo token only once", async () => {
    const user = await createVerifiedUser(t);
    const first = await signInAgain(t, user);
    const second = await signInAgain(t, user);
    const sudo = await sudoToken(user);

    expectGqlOk(
      await gql(t, REVOKE_SESSION, {
        token: user.accessToken,
        cookies: { sudoToken: sudo },
        variables: { sessionId: sessionIdOf(first.accessToken) },
      }),
    );
    const replay = await gql(t, REVOKE_SESSION, {
      token: user.accessToken,
      cookies: { sudoToken: sudo },
      variables: { sessionId: sessionIdOf(second.accessToken) },
    });

    expectGqlError(replay, 401, "Recent password confirmation is required");
    expectGqlOk(await gql(t, ME, { token: second.accessToken }));
  });

  it("does not accept another user's sudo token", async () => {
    const user = await createVerifiedUser(t);
    const other = await signInAgain(t, user);
    const stranger = await createVerifiedUser(t);

    const result = await gql(t, REVOKE_SESSION, {
      token: user.accessToken,
      cookies: { sudoToken: await sudoToken(stranger) },
      variables: { sessionId: sessionIdOf(other.accessToken) },
    });

    expectGqlError(result, 401);
    expectGqlOk(await gql(t, ME, { token: other.accessToken }));
  });

  it("cannot end another user's session", async () => {
    const user = await createVerifiedUser(t);
    const stranger = await createVerifiedUser(t);

    const data = expectGqlOk(
      await gql<{ revokeSession: Revocation }>(t, REVOKE_SESSION, {
        token: user.accessToken,
        cookies: { sudoToken: await sudoToken(user) },
        variables: { sessionId: sessionIdOf(stranger.accessToken) },
      }),
    );

    expect(data.revokeSession.sessionsRevoked).toBe(0);
    expectGqlOk(await gql(t, ME, { token: stranger.accessToken }));
  });

  it("reports nothing revoked for an unknown session", async () => {
    const user = await createVerifiedUser(t);

    const data = expectGqlOk(
      await gql<{ revokeSession: Revocation }>(t, REVOKE_SESSION, {
        token: user.accessToken,
        cookies: { sudoToken: await sudoToken(user) },
        variables: { sessionId: randomUUID() },
      }),
    );

    expect(data.revokeSession).toEqual({ sessionsRevoked: 0, currentSessionRevoked: false });
  });

  it("rejects a session id that is not a UUID", async () => {
    const user = await createVerifiedUser(t);

    const result = await gql(t, REVOKE_SESSION, {
      token: user.accessToken,
      cookies: { sudoToken: await sudoToken(user) },
      variables: { sessionId: "not-a-uuid" },
    });

    expectGqlError(result, 422);
  });
});

describe("revokeSessions", () => {
  it("ends every other session and keeps the current one by default", async () => {
    const user = await createVerifiedUser(t);
    const tablet = await signInAgain(t, user);
    const phone = await signInAgain(t, user);

    const result = await gql<{ revokeSessions: Revocation }>(t, REVOKE_SESSIONS, {
      token: user.accessToken,
      cookies: { sudoToken: await sudoToken(user) },
    });

    expect(expectGqlOk(result).revokeSessions).toEqual({
      sessionsRevoked: 2,
      currentSessionRevoked: false,
    });
    expect(clearsCookie(result.response, "sudoToken")).toBe(true);
    expect(clearsCookie(result.response, "refreshToken")).toBe(false);

    expectGqlOk(await gql(t, ME, { token: user.accessToken }));
    expectGqlError(await gql(t, ME, { token: tablet.accessToken }), 401);
    expectGqlError(await gql(t, ME, { token: phone.accessToken }), 401);
  });

  it("can include the current session, and then clears the refresh cookie", async () => {
    const user = await createVerifiedUser(t);
    await signInAgain(t, user);

    const result = await gql<{ revokeSessions: Revocation }>(t, REVOKE_SESSIONS, {
      token: user.accessToken,
      cookies: { sudoToken: await sudoToken(user) },
      variables: { includeCurrentSession: true },
    });

    expect(expectGqlOk(result).revokeSessions).toEqual({
      sessionsRevoked: 2,
      currentSessionRevoked: true,
    });
    expect(clearsCookie(result.response, "refreshToken")).toBe(true);
    expectGqlError(await gql(t, ME, { token: user.accessToken }), 401);
  });
});
