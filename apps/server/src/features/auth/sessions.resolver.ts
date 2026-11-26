import { Args, Context, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import type { Response } from "express";
import * as z from "zod";

import {
  AccessTokenGuard,
  SudoTokenGuard,
} from "../../common/security/auth.guards.js";
import {
  CurrentSessionId,
  CurrentUser,
} from "../../common/security/current-user.decorator.js";
import type { AuthUser } from "../../common/security/auth-user.type.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import {
  clearRefreshTokenCookie,
  clearSudoTokenCookie,
} from "./auth-cookies.util.js";
import { SessionService } from "./session.service.js";
import { DeviceSession, LogoutSessionsResult } from "./sessions.graphql.js";
import AppError from "../../common/errors/app-error.js";

@Resolver()
@UseGuards(AccessTokenGuard)
export class SessionsResolver {
  constructor(private readonly sessionService: SessionService) {}

  @Query(() => [DeviceSession])
  mySessions(
    @CurrentUser() user: AuthUser,
    @CurrentSessionId() currentSessionId: string,
  ) {
    return this.sessionService.listSessions(user.id, currentSessionId);
  }

  @Mutation(() => LogoutSessionsResult)
  @UseGuards(SudoTokenGuard)
  async logoutSessions(
    @CurrentUser() user: AuthUser,
    @CurrentSessionId() currentSessionId: string,
    @Args("includeCurrentSession", { type: () => Boolean, defaultValue: false })
    includeCurrentSession: boolean,
    @Context() context: { res?: Response },
  ): Promise<LogoutSessionsResult> {
    if (!context.res) {
      throw new AppError("Response context is unavailable", 500);
    }

    const result = await this.sessionService.revokeSessions(
      user.id,
      currentSessionId,
      includeCurrentSession,
    );
    clearSudoTokenCookie(context.res);
    if (result.currentSessionRevoked) clearRefreshTokenCookie(context.res);
    return result;
  }

  @Mutation(() => LogoutSessionsResult)
  @UseGuards(SudoTokenGuard)
  async revokeSession(
    @CurrentUser() user: AuthUser,
    @CurrentSessionId() currentSessionId: string,
    @Args("sessionId", { type: () => ID }, new ZodValidationPipe(z.uuid()))
    sessionId: string,
    @Context() context: { res?: Response },
  ): Promise<LogoutSessionsResult> {
    if (!context.res) {
      throw new AppError("Response context is unavailable", 500);
    }

    const result = await this.sessionService.revokeSession(
      user.id,
      sessionId,
      currentSessionId,
    );
    clearSudoTokenCookie(context.res);
    if (result.currentSessionRevoked) clearRefreshTokenCookie(context.res);
    return result;
  }
}
