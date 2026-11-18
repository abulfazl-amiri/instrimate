import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import type { Request } from "express";

import AppError from "../../utils/error.util.js";
import { verifyAccessToken } from "../../utils/token.util.js";
import * as userRepository from "../users/user.repository.js";

type AuthenticatedUser = {
  email: string;
};

type AuthenticatedRequest = Request & {
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
    const currentUser = await userRepository.findById(decoded.sub);
    if (!currentUser) throw new AppError("User not found", 401);

    request.user = currentUser;
    return true;
  }
}

export type { AuthenticatedRequest };
