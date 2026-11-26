import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";

import { parseToMs } from "../../common/utils/duration.util.js";
import {
  AccessTokenGuard,
  RefreshTokenGuard,
} from "../../common/security/auth.guards.js";
import { CurrentUser } from "../../common/security/current-user.decorator.js";
import type { AuthUser } from "../../common/security/auth-user.type.js";
import {
  confirmPasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  signinSchema,
  signupSchema,
  verifyEmailSchema,
  type ConfirmPasswordInput,
  type ForgotPasswordInput,
  type ResetPasswordInput,
  type SigninInput,
  type SignupInput,
  type VerifyEmailInput,
} from "./auth.schema.js";
import { AuthService } from "./auth.service.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import { authCookieOptions, clearAuthCookies } from "./auth-cookies.util.js";

type CookieRequest = Request & {
  cookies?: Record<string, string | undefined>;
};

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("signup")
  @HttpCode(HttpStatus.OK)
  async signup(
    @Body(new ZodValidationPipe(signupSchema)) body: SignupInput,
  ) {
    await this.authService.signup(body);
    return { message: "Check your inbox for a verification code" };
  }

  @Post("verify-email")
  @HttpCode(HttpStatus.OK)
  async verifyEmail(
    @Body(new ZodValidationPipe(verifyEmailSchema)) body: VerifyEmailInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const tokens = await this.authService.verifyEmail(body, {
      ip: request.ip,
      userAgent: request.get("user-agent"),
    });
    this.setRefreshTokenCookie(tokens.refreshToken, response);
    return { token: tokens.accessToken };
  }

  @Post("resend-verification")
  @HttpCode(HttpStatus.OK)
  async resendVerification(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) body: ForgotPasswordInput,
  ) {
    await this.authService.resendVerificationCode(body.email);
    return { message: "If the account needs verification, a code has been sent" };
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
    clearAuthCookies(response);
  }

  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  @UseGuards(RefreshTokenGuard)
  async refresh(@Req() request: CookieRequest, @Res({ passthrough: true }) response: Response) {
    const tokens = await this.authService.refresh(request.cookies!.refreshToken!, {
      ip: request.ip,
      userAgent: request.get("user-agent"),
    });
    this.setRefreshTokenCookie(tokens.refreshToken, response);
    return { token: tokens.accessToken };
  }

  @Post("password/forgot")
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) body: ForgotPasswordInput,
  ) {
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
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const sudoToken = await this.authService.confirmPassword(body, user.email);
    this.setSudoToken(sudoToken, response);
  }

  private setRefreshTokenCookie(refreshToken: string, response: Response): void {
    response.cookie("refreshToken", refreshToken, {
      ...authCookieOptions,
      maxAge: parseToMs(process.env.REFRESH_TOKEN_EXPIRES_IN!),
    });
  }

  private setSudoToken(sudoToken: string, response: Response): void {
    response.cookie("sudoToken", sudoToken, {
      ...authCookieOptions,
      maxAge: parseToMs(process.env.SUDO_TOKEN_EXPIRES_IN!),
    });
  }
}
