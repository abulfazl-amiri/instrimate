import { createParamDecorator } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";

import AppError from "../errors/app-error.js";
import { getAuthenticatedRequest } from "./auth.guards.js";
import type { AuthUser } from "./auth-user.type.js";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser => {
    const request = getAuthenticatedRequest(context);
    if (!request.user) throw new AppError("Authenticated user is unavailable", 401);
    return request.user;
  },
);

export const CurrentSessionId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const request = getAuthenticatedRequest(context);
    if (!request.sessionId) throw new AppError("Authenticated session is unavailable", 401);
    return request.sessionId;
  },
);
