import { Injectable } from "@nestjs/common";
import type { Prisma, User } from "@prisma/client";
import * as z from "zod";

import AppError from "../../common/errors/app-error.js";
import { SessionService } from "../auth/session.service.js";
import * as PasswordUtils from "../../common/utils/password.util.js";
import { PrismaService } from "../../database/prisma.service.js";
import type { ChangePasswordInput, UpdateRoleInput, UpdateUserInput } from "./user.schema.js";

type UserListQuery = Record<string, unknown>;
type PublicUser = Omit<User, "passwordHash">;
type UserSortField = "id" | "name" | "email" | "role" | "createdAt" | "updatedAt";
type CreateUserInput = {
  name: string;
  email: string;
  passwordHash: string;
};

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sessionService: SessionService,
  ) {}

  async createUser(input: CreateUserInput) {
    input.email = this.getEmail(input.email);
    const user = await this.prisma.user.create({
      data: {
        ...input,
      },
    });
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: this.getEmail(email) } });
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.findByEmail(email);
    if (!user || !(await PasswordUtils.compare(password, user.passwordHash))) return null;

    return user;
  }

  async verifyEmail(id: string): Promise<boolean> {
    const result = await this.prisma.user.updateMany({
      where: { id, emailVerifiedAt: null },
      data: { emailVerifiedAt: new Date() },
    });
    return result.count === 1;
  }

  async resetPassword(id: string, password: string): Promise<void> {
    if (!z.uuid().safeParse(id).success) throw new AppError("User not found", 404);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await PasswordUtils.hash(password) },
    });
  }

  async getById(id: string): Promise<PublicUser> {
    if (!z.uuid().safeParse(id).success) throw new AppError("User not found", 404);

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError("User not found", 404);

    return this.toPublicUser(user);
  }

  async getFilteredUsers(query: UserListQuery): Promise<Record<string, unknown>[]> {
    const where: Prisma.UserWhereInput = {};
    if (typeof query.name === "string" && query.name.trim()) where.name = query.name;
    if (typeof query.email === "string" && query.email.trim()) {
      where.email = this.getEmail(query.email);
    }

    if (query.role === "ADMIN") where.role = "ADMIN";
    if (query.role === "TEACHER") where.role = "TEACHER";

    const limit = Math.min(Math.max(this.parseNumber(query.limit, 10), 1), 100);
    const page = Math.max(this.parseNumber(query.page, 1), 1);
    const users = await this.prisma.user.findMany({
      where,
      orderBy: this.getOrderBy(query.sort),
      skip: limit * (page - 1),
      take: limit,
    });

    return users.map((user) => this.projectFields(this.toPublicUser(user), query.fields));
  }

  async updateById(id: string, input: UpdateUserInput): Promise<PublicUser> {
    if (!z.uuid().safeParse(id).success) throw new AppError("User not found", 404);

    const data: Prisma.UserUpdateInput = {};
    if (input.email !== undefined) data.email = this.getEmail(input.email);
    if (input.name !== undefined) data.name = input.name.trim();

    const user = await this.prisma.user.update({ where: { id }, data });
    return this.toPublicUser(user);
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
    return this.toPublicUser(user);
  }

  async changePassword(id: string, input: ChangePasswordInput): Promise<void> {
    if (!z.uuid().safeParse(id).success) throw new AppError("User not found", 404);

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new AppError("User not found", 404);

    const matches = await PasswordUtils.compare(input.oldPassword, user.passwordHash);
    if (!matches) throw new AppError("Old password was incorrect", 401);

    await this.prisma.user.update({
      where: { id },
      data: { passwordHash: await PasswordUtils.hash(input.newPassword) },
    });
    await this.sessionService.revokeAll(id);
  }

  //
  //
  // helpers

  private getEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private toPublicUser({ passwordHash: _passwordHash, ...user }: User): PublicUser {
    return user;
  }

  private parseNumber(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : fallback;
  }

  private getOrderBy(value: unknown): Prisma.UserOrderByWithRelationInput[] {
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
  }

  private projectFields(user: PublicUser, fields: unknown): Record<string, unknown> {
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
  }
}
