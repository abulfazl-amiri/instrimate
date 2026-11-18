import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import type { User } from "@prisma/client";
import type { Request } from "express";
import * as z from "zod";

import AppError from "../../utils/error.util.js";
import { verifyAccessToken } from "../../utils/token.util.js";
import { PrismaService } from "../../database/prisma.service.js";

export type AuthenticatedUser = Pick<
  User,
  "id" | "email" | "name" | "role" | "createdAt" | "updatedAt"
>;

export type AuthenticatedRequest = Request & {
  user?: AuthenticatedUser;
};

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.cookies?.refreshToken) {
      throw new AppError("Refresh token must be provided in the cookies", 401);
    }

    return true;
  }
}

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authorization = request.headers.authorization;
    if (!authorization) throw new AppError("Authorization header is missing", 401);

    const [scheme, accessToken] = authorization.split(" ");
    if (authorization.split(" ").length !== 2 || !scheme) {
      throw new AppError("Malformed token is provided", 401);
    }
    if (!accessToken) throw new AppError("Token is missing.", 401);

    const decoded = verifyAccessToken(accessToken);
    const subject =
      typeof decoded === "object" && decoded !== null && "sub" in decoded ? decoded.sub : undefined;
    if (typeof subject !== "string" || !z.uuid().safeParse(subject).success) {
      throw new AppError("Invalid token, please log in again", 401);
    }

    const user = await this.prisma.user.findUnique({
      where: { id: subject },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new AppError("User not found", 401);

    request.user = user;
    return true;
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (request.user?.role !== "admin") {
      throw new AppError("You do not have permission", 403);
    }

    return true;
  }
}
