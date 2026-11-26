import type { User } from "@prisma/client";

export type AuthUser = Pick<
  User,
  "id" | "email" | "name" | "role" | "status" | "createdAt" | "updatedAt"
>;
