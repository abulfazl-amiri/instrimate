import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";

import { parseToMs } from "../../utils/parser.util.js";
import {
  AccessTokenGuard,
  RefreshTokenGuard,
  type AuthenticatedRequest,
} from "../../common/security/auth.guards.js";
import {
  confirmPasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  signinSchema,
  signupSchema,
  type ConfirmPasswordInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type SigninInput,
  type SignupInput,
} from "./auth.schema.js";
import { AuthService } from "./auth.service.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";

const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "strict" as const,
};

type CookieRequest = Request & {
  cookies?: Record<string, string | undefined>;
};

@Controller("api/v1/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signup")
  @HttpCode(HttpStatus.OK)
  async signup(
    @Body(new ZodValidationPipe(signupSchema)) body: SignupInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const tokens = await this.authService.signup(body, {
      ip: request.ip,
      userAgent: request.get("user-agent"),
    });
    this.setRefreshTokenCookie(tokens.refreshToken, response);
    return { token: tokens.accessToken };
  }

  @Post("signin")
  @HttpCode(HttpStatus.OK)
  async signin(
    @Body(new ZodValidationPipe(signinSchema)) body: SigninInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const tokens = await this.authService.signin(body, {
      ip: request.ip,
      userAgent: request.get("user-agent"),
    });
    this.setRefreshTokenCookie(tokens.refreshToken, response);
    return { token: tokens.accessToken };
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RefreshTokenGuard)
  async logout(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.authService.logout(request.cookies!.refreshToken!);
    response.clearCookie("refreshToken", cookieOptions);
    response.clearCookie("sudoToken", cookieOptions);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshTokenGuard)
  async refresh(
    @Req() request: CookieRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const tokens = await this.authService.refresh(request.cookies!.refreshToken!, {
      ip: request.ip,
      userAgent: request.get("user-agent"),
    });
    this.setRefreshTokenCookie(tokens.refreshToken, response);
    return { token: tokens.accessToken };
  }

  @Post("password/forgot")
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body(new ZodValidationPipe(forgotPasswordSchema)) body: ForgotPasswordInput) {
    await this.authService.forgotPassword(body);
    return { message: "Check your inbox for a reset link" };
  }

  @Post("password/reset")
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordInput) {
    await this.authService.resetPassword(body);
    return { message: "Password reset successfully" };
  }

  @Post("confirm-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AccessTokenGuard)
  async confirmPassword(
    @Body(new ZodValidationPipe(confirmPasswordSchema)) body: ConfirmPasswordInput,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const sudoToken = await this.authService.confirmPassword(body, request.user!.email);
    response.cookie("sudoToken", sudoToken, {
      ...cookieOptions,
      maxAge: parseToMs(process.env.SUDO_TOKEN_EXPIRES_IN!),
    });
  }

  private setRefreshTokenCookie(refreshToken: string, response: Response): void {
    response.cookie("refreshToken", refreshToken, {
      ...cookieOptions,
      maxAge: parseToMs(process.env.REFRESH_TOKEN_EXPIRES_IN!),
    });
  }
}
