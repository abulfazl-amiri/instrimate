import { Injectable } from "@nestjs/common";
import type { Prisma, User } from "@prisma/client";
import * as z from "zod";

import AppError from "../../common/errors/app-error.js";
import * as passwordUtils from "./password.util.js";
import { SessionService } from "../auth/session.service.js";
import { PrismaService } from "../../database/prisma.service.js";
import type {
  ChangePasswordInput,
  UpdateRoleInput,
  UpdateUserInput,
} from "./user.schema.js";

type UserListQuery = Record<string, unknown>;
type PublicUser = Omit<User, "passwordHash">;
type UserSortField = "id" | "name" | "email" | "role" | "createdAt" | "updatedAt";

const getEmail = (email: string): string => email.trim().toLowerCase();

const toPublicUser = ({ passwordHash: _passwordHash, ...user }: User): PublicUser => user;

const parseNumber = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
};

const getOrderBy = (value: unknown): Prisma.UserOrderByWithRelationInput[] => {
  if (typeof value !== "string" || !value.trim()) return [{ createdAt: "desc" }];

  const orderBy: Prisma.UserOrderByWithRelationInput[] = [];
  for (const field of value.split(",")) {
    const descending = field.startsWith("-");
    const name = (descending ? field.slice(1) : field) as UserSortField;
    const direction = descending ? "desc" : "asc";

    switch (name) {
      case "id":
        orderBy.push({ id: direction });
        break;
      case "name":
        orderBy.push({ name: direction });
        break;
      case "email":
        orderBy.push({ email: direction });
        break;
      case "role":
        orderBy.push({ role: direction });
        break;
      case "createdAt":
        orderBy.push({ createdAt: direction });
        break;
      case "updatedAt":
        orderBy.push({ updatedAt: direction });
        break;
    }
  }

  return orderBy.length ? orderBy : [{ createdAt: "desc" }];
};

const projectFields = (user: PublicUser, fields: unknown): Record<string, unknown> => {
  const availableFields = Object.keys(user) as Array<keyof PublicUser>;
  if (typeof fields !== "string" || !fields.trim()) {
    return Object.fromEntries(
      availableFields
        .filter((field) => field !== "createdAt" && field !== "updatedAt")
        .map((field) => [field, user[field]]),
    );
  }

  const requestedFields = fields.split(",").map((field) => field.trim());
  const includeFields = requestedFields.filter((field) => !field.startsWith("-"));
  const excludedFields = new Set(
    requestedFields.filter((field) => field.startsWith("-")).map((field) => field.slice(1)),
  );
  const selectedFields =
    includeFields.length > 0
      ? availableFields.filter((field) => includeFields.includes(field))
      : availableFields.filter((field) => !excludedFields.has(field));

  return Object.fromEntries(selectedFields.map((field) => [field, user[field]]));
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
  ) {}

  async createUser({ email, password, name }: { email: string; password: string; name: string }) {
    const normalizedEmail = getEmail(email);
    const existingUser = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) throw new AppError("Email is already in use", 409);

    const user = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name.trim() || normalizedEmail.split("@")[0],
        passwordHash: await passwordUtils.hash(password),
      },
    });
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: getEmail(email) } });
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user || !(await passwordUtils.compare(password, user.passwordHash))) return null;

    return user;
  }

  async resetPassword(id: string, password: string): Promise<void> {
    if (!z.uuid().safeParse(id).success) throw new AppError("User not found", 404);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await passwordUtils.hash(password) },
    });
  }

  async getById(id: string): Promise<PublicUser> {
    if (!z.uuid().safeParse(id).success) throw new AppError("User not found", 404);

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError("User not found", 404);

    return toPublicUser(user);
  }

  async getFilteredUsers(query: UserListQuery): Promise<Record<string, unknown>[]> {
    const where: Prisma.UserWhereInput = {};
    for (const field of ["name", "email"] as const) {
      const value = query[field];
      if (typeof value === "string" && value.trim()) {
        where[field] = field === "email" ? getEmail(value) : value;
      }
    }
    if (query.role === "admin" || query.role === "teacher") where.role = query.role;

    const limit = Math.min(Math.max(parseNumber(query.limit, 10), 1), 100);
    const page = Math.max(parseNumber(query.page, 1), 1);
    const users = await this.prisma.user.findMany({
      where,
      orderBy: getOrderBy(query.sort),
      skip: limit * (page - 1),
      take: limit,
    });

    return users.map((user) => projectFields(toPublicUser(user), query.fields));
  }

  async updateById(id: string, input: UpdateUserInput): Promise<PublicUser> {
    if (!z.uuid().safeParse(id).success) throw new AppError("User not found", 404);

    const data: Prisma.UserUpdateInput = {};
    if (input.email !== undefined) data.email = getEmail(input.email);
    if (input.name !== undefined) data.name = input.name.trim();

    const user = await this.prisma.user.update({ where: { id }, data });
    return toPublicUser(user);
  }

  async deleteById(id: string): Promise<void> {
    if (!z.uuid().safeParse(id).success) throw new AppError("User not found", 404);

    await this.sessionService.revokeAll(id);
    await this.prisma.user.delete({ where: { id } });
  }

  async updateRole(id: string, input: UpdateRoleInput): Promise<PublicUser> {
    if (!z.uuid().safeParse(id).success) throw new AppError("User not found", 404);

    const user = await this.prisma.user.update({
      where: { id },
      data: { role: input.role },
    });
    return toPublicUser(user);
  }

  async changePassword(id: string, input: ChangePasswordInput): Promise<void> {
    if (!z.uuid().safeParse(id).success) throw new AppError("User not found", 404);

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError("User not found", 404);

    const matches = await passwordUtils.compare(input.oldPassword, user.passwordHash);
    if (!matches) throw new AppError("Old password was incorrect", 401);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await passwordUtils.hash(input.newPassword) },
    });
    await this.sessionService.revokeAll(id);
  }
}
