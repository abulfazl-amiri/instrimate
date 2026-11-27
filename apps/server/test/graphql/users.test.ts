import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  createAdmin,
  createVerifiedUser,
  expectGqlError,
  expectGqlOk,
  gql,
  ME,
  signin,
  signInAgain,
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

type GqlUser = { id: string; name: string; email: string; role: string; emailVerifiedAt: string | null };

describe("me", () => {
  it("returns the signed-in user's profile", async () => {
    const user = await createVerifiedUser(t, { name: "Maryam" });

    const data = expectGqlOk(await gql<{ me: GqlUser }>(t, ME, { token: user.accessToken }));

    expect(data.me).toMatchObject({
      id: user.id,
      name: "Maryam",
      email: user.email,
      role: "TEACHER",
      status: "ACTIVE",
    });
    expect(data.me.emailVerifiedAt).toEqual(expect.any(String));
  });

  it("does not expose the password hash in the schema", async () => {
    const user = await createVerifiedUser(t);

    const result = await gql(t, "query { me { passwordHash } }", { token: user.accessToken });

    expect(result.errors?.[0]?.message).toMatch(/Cannot query field "passwordHash"/);
  });
});

describe("updateMe", () => {
  const UPDATE_ME = /* GraphQL */ `
    mutation ($input: UpdateMeInput!) {
      updateMe(input: $input) {
        name
      }
    }
  `;

  it("updates and trims the name", async () => {
    const user = await createVerifiedUser(t);

    const data = expectGqlOk(
      await gql<{ updateMe: { name: string } }>(t, UPDATE_ME, {
        token: user.accessToken,
        variables: { input: { name: "  New Name  " } },
      }),
    );

    expect(data.updateMe.name).toBe("New Name");
  });

  it("rejects an empty name with 422", async () => {
    const user = await createVerifiedUser(t);

    const result = await gql(t, UPDATE_ME, {
      token: user.accessToken,
      variables: { input: { name: "   " } },
    });

    expectGqlError(result, 422, "Validation failed");
  });

  it("cannot change the email or role", async () => {
    const user = await createVerifiedUser(t);

    const result = await gql(t, UPDATE_ME, {
      token: user.accessToken,
      variables: { input: { email: uniqueEmail(), role: "ADMIN" } },
    });

    expect(result.errors).toBeDefined();
    const stored = await t.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored).toMatchObject({ email: user.email, role: "TEACHER" });
  });
});

describe("changeMyPassword", () => {
  const CHANGE_PASSWORD = /* GraphQL */ `
    mutation ($input: ChangePasswordInput!) {
      changeMyPassword(input: $input)
    }
  `;

  it("changes the password and ends every session", async () => {
    const user = await createVerifiedUser(t);
    const other = await signInAgain(t, user);

    const data = expectGqlOk(
      await gql<{ changeMyPassword: boolean }>(t, CHANGE_PASSWORD, {
        token: user.accessToken,
        variables: { input: { oldPassword: user.password, newPassword: "a-new-password" } },
      }),
    );

    expect(data.changeMyPassword).toBe(true);
    expectGqlError(await gql(t, ME, { token: user.accessToken }), 401);
    expectGqlError(await gql(t, ME, { token: other.accessToken }), 401);
    expect((await signin(t, user.email, user.password)).status).toBe(401);
    expect((await signin(t, user.email, "a-new-password")).status).toBe(200);
  });

  it("rejects a wrong old password", async () => {
    const user = await createVerifiedUser(t);

    const result = await gql(t, CHANGE_PASSWORD, {
      token: user.accessToken,
      variables: { input: { oldPassword: "wrong-password", newPassword: "a-new-password" } },
    });

    expectGqlError(result, 401, "Old password was incorrect");
  });

  it("refuses to reuse the current password", async () => {
    const user = await createVerifiedUser(t);

    const result = await gql(t, CHANGE_PASSWORD, {
      token: user.accessToken,
      variables: { input: { oldPassword: user.password, newPassword: user.password } },
    });

    expectGqlError(result, 422, "New password must be different");
  });
});

describe("deleteMe", () => {
  it("deletes the account and its sessions", async () => {
    const user = await createVerifiedUser(t);

    const data = expectGqlOk(
      await gql<{ deleteMe: boolean }>(t, "mutation { deleteMe }", { token: user.accessToken }),
    );

    expect(data.deleteMe).toBe(true);
    await expect(t.prisma.user.findUnique({ where: { id: user.id } })).resolves.toBeNull();
    expectGqlError(await gql(t, ME, { token: user.accessToken }), 401);
    expect((await signin(t, user.email, user.password)).status).toBe(401);
  });
});

describe("admin operations", () => {
  const USERS = /* GraphQL */ `
    query ($filter: UserFilterInput) {
      users(filter: $filter) {
        results
        totalCount
        page
        limit
        totalPages
        hasNextPage
        hasPreviousPage
        data {
          id
          email
          role
        }
      }
    }
  `;
  const USER = /* GraphQL */ `
    query ($id: ID!) {
      user(id: $id) {
        id
        email
      }
    }
  `;
  const UPDATE_USER = /* GraphQL */ `
    mutation ($id: ID!, $input: UpdateUserInput!) {
      updateUser(id: $id, input: $input) {
        email
        emailVerifiedAt
      }
    }
  `;
  const UPDATE_ROLE = /* GraphQL */ `
    mutation ($id: ID!, $input: UpdateRoleInput!) {
      updateUserRole(id: $id, input: $input) {
        role
      }
    }
  `;
  const DELETE_USER = /* GraphQL */ `
    mutation ($id: ID!) {
      deleteUser(id: $id)
    }
  `;

  it("are forbidden for teachers", async () => {
    const teacher = await createVerifiedUser(t);
    const token = teacher.accessToken;
    const variables = { id: teacher.id };

    expectGqlError(await gql(t, USERS, { token }), 403, "You do not have permission");
    expectGqlError(await gql(t, USER, { token, variables }), 403);
    expectGqlError(await gql(t, DELETE_USER, { token, variables }), 403);
    expectGqlError(
      await gql(t, UPDATE_ROLE, { token, variables: { ...variables, input: { role: "ADMIN" } } }),
      403,
    );
    const stored = await t.prisma.user.findUniqueOrThrow({ where: { id: teacher.id } });
    expect(stored.role).toBe("TEACHER");
  });

  it("list users with pagination and a role filter", async () => {
    const admin = await createAdmin(t);
    for (let index = 0; index < 3; index += 1) await createVerifiedUser(t);

    const page = expectGqlOk(
      await gql<{ users: Record<string, unknown> & { data: GqlUser[] } }>(t, USERS, {
        token: admin.accessToken,
        variables: { filter: { role: "TEACHER", limit: 2, page: 1 } },
      }),
    );

    expect(page.users).toMatchObject({
      results: 2,
      totalCount: 3,
      page: 1,
      limit: 2,
      totalPages: 2,
      hasNextPage: true,
      hasPreviousPage: false,
    });
    expect(page.users.data.every((user) => user.role === "TEACHER")).toBe(true);
  });

  it("look up a user by id", async () => {
    const admin = await createAdmin(t);
    const teacher = await createVerifiedUser(t);

    const found = expectGqlOk(
      await gql<{ user: GqlUser }>(t, USER, {
        token: admin.accessToken,
        variables: { id: teacher.id },
      }),
    );
    expect(found.user).toEqual({ id: teacher.id, email: teacher.email });

    expectGqlError(
      await gql(t, USER, { token: admin.accessToken, variables: { id: randomUUID() } }),
      404,
      "User not found",
    );
    expectGqlError(
      await gql(t, USER, { token: admin.accessToken, variables: { id: "not-a-uuid" } }),
      422,
    );
  });

  it("changing a user's email requires them to verify it again", async () => {
    const admin = await createAdmin(t);
    const teacher = await createVerifiedUser(t);
    const newEmail = uniqueEmail();

    const data = expectGqlOk(
      await gql<{ updateUser: GqlUser }>(t, UPDATE_USER, {
        token: admin.accessToken,
        variables: { id: teacher.id, input: { email: newEmail.toUpperCase() } },
      }),
    );

    expect(data.updateUser).toEqual({ email: newEmail, emailVerifiedAt: null });
    expectGqlError(await gql(t, ME, { token: teacher.accessToken }), 403, "Email must be verified");
  });

  it("changing a user's email to one in use is a conflict", async () => {
    const admin = await createAdmin(t);
    const teacher = await createVerifiedUser(t);

    const result = await gql(t, UPDATE_USER, {
      token: admin.accessToken,
      variables: { id: teacher.id, input: { email: admin.email } },
    });

    expectGqlError(result, 409);
  });

  it("promote a teacher to admin", async () => {
    const admin = await createAdmin(t);
    const teacher = await createVerifiedUser(t);

    const data = expectGqlOk(
      await gql<{ updateUserRole: { role: string } }>(t, UPDATE_ROLE, {
        token: admin.accessToken,
        variables: { id: teacher.id, input: { role: "ADMIN" } },
      }),
    );

    expect(data.updateUserRole.role).toBe("ADMIN");
    expectGqlOk(await gql(t, USERS, { token: teacher.accessToken }));
  });

  it("delete a user and end their sessions", async () => {
    const admin = await createAdmin(t);
    const teacher = await createVerifiedUser(t);

    const data = expectGqlOk(
      await gql<{ deleteUser: boolean }>(t, DELETE_USER, {
        token: admin.accessToken,
        variables: { id: teacher.id },
      }),
    );

    expect(data.deleteUser).toBe(true);
    await expect(t.prisma.user.findUnique({ where: { id: teacher.id } })).resolves.toBeNull();
    expectGqlError(await gql(t, ME, { token: teacher.accessToken }), 401);
  });
});
