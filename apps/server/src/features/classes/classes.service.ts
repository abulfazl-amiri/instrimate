import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Class } from "@prisma/client";
import * as z from "zod";

import AppError from "../../common/errors/app-error.js";
import { PrismaService } from "../../database/prisma.service.js";
import type {
  ClassFilterInput,
  CreateClassInput,
  UpdateClassInput,
} from "./class.schema.js";

type PaginatedClasses = {
  results: number;
  data: Class[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};
type ClassSortField = "id" | "name" | "status" | "createdAt" | "updatedAt";

const CLASS_NOT_FOUND = "Class not found";

@Injectable()
export class ClassesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(teacherId: string, input: CreateClassInput): Promise<Class> {
    return this.prisma.class.create({
      data: {
        teacherId,
        name: input.name,
        description: input.description || null,
      },
    });
  }

  async getFiltered(
    teacherId: string,
    query: NonNullable<ClassFilterInput>,
  ): Promise<PaginatedClasses> {
    const where: Prisma.ClassWhereInput = { teacherId };
    if (query.status) where.status = query.status;

    const limit = Math.min(Math.max(query.limit ?? 10, 1), 100);
    const page = Math.max(query.page ?? 1, 1);
    const [classes, totalCount] = await Promise.all([
      this.prisma.class.findMany({
        where,
        orderBy: this.getOrderBy(query.sort),
        skip: limit * (page - 1),
        take: limit,
      }),
      this.prisma.class.count({ where }),
    ]);
    const totalPages = Math.ceil(totalCount / limit);

    return {
      results: classes.length,
      data: classes,
      totalCount,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  async getById(teacherId: string, id: string): Promise<Class> {
    if (!z.uuid().safeParse(id).success) throw new AppError(CLASS_NOT_FOUND, 404);

    const found = await this.prisma.class.findFirst({ where: { id, teacherId } });
    if (!found) throw new AppError(CLASS_NOT_FOUND, 404);

    return found;
  }

  async updateById(teacherId: string, id: string, input: UpdateClassInput): Promise<Class> {
    if (!z.uuid().safeParse(id).success) throw new AppError(CLASS_NOT_FOUND, 404);

    const data: Prisma.ClassUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description || null;
    if (input.status !== undefined) data.status = input.status;

    // Nothing to change: still enforce ownership, but don't touch updatedAt.
    if (Object.keys(data).length === 0) return this.getById(teacherId, id);

    try {
      // The ownership check is part of the same query, so another teacher's id
      // never matches a row and behaves exactly like a missing id.
      return await this.prisma.class.update({ where: { id, teacherId }, data });
    } catch (error) {
      if (this.isRecordNotFound(error)) throw new AppError(CLASS_NOT_FOUND, 404);
      throw error;
    }
  }

  async deleteById(teacherId: string, id: string): Promise<void> {
    if (!z.uuid().safeParse(id).success) throw new AppError(CLASS_NOT_FOUND, 404);

    const { count } = await this.prisma.class.deleteMany({ where: { id, teacherId } });
    if (count === 0) throw new AppError(CLASS_NOT_FOUND, 404);
  }

  private isRecordNotFound(error: unknown): boolean {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
  }

  private getOrderBy(value: unknown): Prisma.ClassOrderByWithRelationInput[] {
    if (typeof value !== "string" || !value.trim()) {
      return [{ createdAt: "desc" }, { id: "asc" }];
    }

    const orderBy: Prisma.ClassOrderByWithRelationInput[] = [];
    for (const field of value.split(",")) {
      const descending = field.startsWith("-");
      const name = (descending ? field.slice(1) : field) as ClassSortField;
      const direction = descending ? "desc" : "asc";

      switch (name) {
        case "id":
          orderBy.push({ id: direction });
          break;
        case "name":
          orderBy.push({ name: direction });
          break;
        case "status":
          orderBy.push({ status: direction });
          break;
        case "createdAt":
          orderBy.push({ createdAt: direction });
          break;
        case "updatedAt":
          orderBy.push({ updatedAt: direction });
          break;
      }
    }

    if (orderBy.length === 0) return [{ createdAt: "desc" }, { id: "asc" }];
    if (!orderBy.some((field) => "id" in field)) orderBy.push({ id: "asc" });
    return orderBy;
  }
}
