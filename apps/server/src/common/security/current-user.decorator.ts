import { createParamDecorator } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";

import AppError from "../errors/app-error.js";
import type { AuthenticatedRequest } from "./auth.guards.js";
import type { AuthUser } from "./auth-user.type.js";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!request.user) throw new AppError("Authenticated user is unavailable", 401);
    return request.user;
  },
);
