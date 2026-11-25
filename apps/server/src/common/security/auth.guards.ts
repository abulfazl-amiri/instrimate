import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { GqlExecutionContext } from "@nestjs/graphql";
import type { Request } from "express";
import * as z from "zod";

import AppError from "../errors/app-error.js";
import { verifyAccessToken } from "./jwt.util.js";
import { PrismaService } from "../../database/prisma.service.js";
import type { AuthUser } from "./auth-user.type.js";

export type AuthenticatedRequest = Request & {
  user?: AuthUser;
};

export function getAuthenticatedRequest(context: ExecutionContext): AuthenticatedRequest {
  if (context.getType<string>() === "graphql") {
    const request = GqlExecutionContext.create(context).getContext<{
      req?: AuthenticatedRequest;
    }>().req;
    if (!request) throw new AppError("Request context is unavailable", 500);
    return request;
  }

  return context.switchToHttp().getRequest<AuthenticatedRequest>();
}

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
    const request = getAuthenticatedRequest(context);
    const authorization = request.headers.authorization;
    if (!authorization) throw new AppError("Authorization header is missing", 401);

    const [scheme, accessToken, ...extra] = authorization.trim().split(/\s+/);
    if (scheme?.toLowerCase() !== "bearer" || extra.length > 0) {
      throw new AppError("Malformed token is provided", 401);
    }
    if (!accessToken) throw new AppError("Token is missing.", 401);

    const decoded = verifyAccessToken(accessToken);
    const subject = typeof decoded === "string" ? undefined : decoded.sub;
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
        status: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new AppError("User not found", 401);
    if (user.status !== "ACTIVE") throw new AppError("Account is not active", 403);
    if (!user.emailVerifiedAt) {
      throw new AppError("Email must be verified before accessing this resource", 403);
    }

    request.user = user;
    return true;
  }
}

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = getAuthenticatedRequest(context);
    if (request.user?.role !== "ADMIN") {
      throw new AppError("You do not have permission", 403);
    }

    return true;
  }
}
