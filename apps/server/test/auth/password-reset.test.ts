import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  AUTH,
  cookieValue,
  createVerifiedUser,
  expectGqlError,
  gql,
  ME,
  post,
  signin,
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

const NEW_PASSWORD = "a-brand-new-password";

describe("POST /auth/password/forgot", () => {
  it("emails a reset link that points at the web app", async () => {
    const user = await createVerifiedUser(t);

    const res = await post(t, `${AUTH}/password/forgot`, { email: user.email });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Check your inbox for a reset link" });
    expect(t.inbox.lastTo(user.email).message).toContain(
      `${process.env.CLIENT_URL}/reset-password?token=`,
    );
  });

  it("does not reveal whether an account exists", async () => {
    const res = await post(t, `${AUTH}/password/forgot`, { email: uniqueEmail() });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Check your inbox for a reset link" });
    expect(t.inbox.sent).toHaveLength(0);
  });

  it("sends only one email during the cooldown", async () => {
    const user = await createVerifiedUser(t);

    await post(t, `${AUTH}/password/forgot`, { email: user.email });
    const second = await post(t, `${AUTH}/password/forgot`, { email: user.email });

    expect(second.status).toBe(200);
    // One verification email plus one reset email.
    expect(t.inbox.sentTo(user.email)).toHaveLength(2);
  });

  it("returns 503 when the email can't be sent, and releases the cooldown", async () => {
    const user = await createVerifiedUser(t);
    t.inbox.failNext();

    const failed = await post(t, `${AUTH}/password/forgot`, { email: user.email });
    expect(failed.status).toBe(503);

    const retry = await post(t, `${AUTH}/password/forgot`, { email: user.email });
    expect(retry.status).toBe(200);
    expect(t.inbox.resetToken(user.email)).toBeTruthy();
  });
});

describe("POST /auth/password/reset", () => {
  async function requestReset() {
    const user = await createVerifiedUser(t);
    await post(t, `${AUTH}/password/forgot`, { email: user.email });
    return { user, resetToken: t.inbox.resetToken(user.email) };
  }

  it("changes the password and ends every existing session", async () => {
    const { user, resetToken } = await requestReset();

    const res = await post(t, `${AUTH}/password/reset`, { resetToken, newPassword: NEW_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Password reset successfully" });

    expect((await signin(t, user.email, user.password)).status).toBe(401);
    expect((await signin(t, user.email, NEW_PASSWORD)).status).toBe(200);

    expectGqlError(await gql(t, ME, { token: user.accessToken }), 401);
    const refresh = await post(t, `${AUTH}/refresh`, undefined, {
      refreshToken: user.refreshToken,
    });
    expect(refresh.status).toBe(401);
  });

  it("does not accept a reset token twice", async () => {
    const { resetToken } = await requestReset();
    await post(t, `${AUTH}/password/reset`, { resetToken, newPassword: NEW_PASSWORD });

    const replay = await post(t, `${AUTH}/password/reset`, {
      resetToken,
      newPassword: "yet-another-password",
    });

    expect(replay.status).toBe(401);
    expect(replay.body.message).toBe("Invalid or expired reset token");
  });

  it("refuses the current password and keeps the token usable", async () => {
    const { user, resetToken } = await requestReset();

    const same = await post(t, `${AUTH}/password/reset`, {
      resetToken,
      newPassword: user.password,
    });
    expect(same.status).toBe(422);
    expect(same.body.message).toBe("New password must be different from your current password");

    const retry = await post(t, `${AUTH}/password/reset`, {
      resetToken,
      newPassword: NEW_PASSWORD,
    });
    expect(retry.status).toBe(200);
  });

  it("rejects an unknown token", async () => {
    const res = await post(t, `${AUTH}/password/reset`, {
      resetToken: "not-a-real-token",
      newPassword: NEW_PASSWORD,
    });

    expect(res.status).toBe(401);
  });

  it("rejects a short new password with 422", async () => {
    const { resetToken } = await requestReset();

    const res = await post(t, `${AUTH}/password/reset`, { resetToken, newPassword: "short" });

    expect(res.status).toBe(422);
  });
});

describe("POST /auth/confirm-password", () => {
  it("issues a sudo cookie for the right password", async () => {
    const user = await createVerifiedUser(t);

    const res = await post(t, `${AUTH}/confirm-password`, { password: user.password }).set(
      "Authorization",
      `Bearer ${user.accessToken}`,
    );

    expect(res.status).toBe(204);
    cookieValue(res, "sudoToken");
  });

  it("rejects a wrong password", async () => {
    const user = await createVerifiedUser(t);

    const res = await post(t, `${AUTH}/confirm-password`, { password: "wrong-password" }).set(
      "Authorization",
      `Bearer ${user.accessToken}`,
    );

    expect(res.status).toBe(401);
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("requires an access token", async () => {
    const res = await post(t, `${AUTH}/confirm-password`, { password: "whatever" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Authorization header is missing");
  });
});
