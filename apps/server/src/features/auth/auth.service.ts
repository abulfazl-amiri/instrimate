import { Injectable } from "@nestjs/common";
import { RedisService } from "../../infrastructure/redis/redis.service.js";
import AppError from "../../common/errors/app-error.js";
import {
  generateResetToken,
  generateSudoToken,
  hashToken,
} from "../../common/security/token.util.js";
import { EmailService } from "../../infrastructure/email/email.service.js";
import { parseToSec } from "../../common/utils/duration.util.js";
import { UsersService } from "../users/users.service.js";
import { SessionService } from "./session.service.js";
import type {
  ConfirmPasswordInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  SigninInput,
  SignupInput,
} from "./auth.schema.js";

type ClientMetadata = {
  ip?: string;
  userAgent?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionService: SessionService,
    private readonly redis: RedisService,
    private readonly email: EmailService,
  ) {}

  async signup(input: SignupInput, metadata: ClientMetadata) {
    const user = await this.usersService.createUser(input);
    return this.sessionService.createSession({
      userId: user.id,
      ip: metadata.ip,
      userAgent: metadata.userAgent,
    });
  }

  async signin(input: SigninInput, metadata: ClientMetadata) {
    const user = await this.usersService.verifyPassword(input.email, input.password);
    if (!user) throw new AppError("Email or password was incorrect", 401);

    return this.sessionService.createSession({
      userId: user.id,
      ip: metadata.ip,
      userAgent: metadata.userAgent,
    });
  }

  async refresh(refreshToken: string, metadata: ClientMetadata) {
    const session = await this.sessionService.validateSession(refreshToken);
    if (!session) throw new AppError("Invalid or expired session", 401);

    const user = await this.usersService.getById(session.userId);

    await this.sessionService.deleteSession(refreshToken);
    return this.sessionService.createSession({
      userId: user.id,
      ip: metadata.ip,
      userAgent: metadata.userAgent,
    });
  }

  async logout(refreshToken: string) {
    await this.sessionService.deleteSession(refreshToken);
  }

  async forgotPassword(input: ForgotPasswordInput) {
    const user = await this.usersService.findByEmail(input.email);
    if (!user) return;

    const resetToken = generateResetToken();
    const key = `reset:${hashToken(resetToken)}`;
    await this.redis.set(key, user.id.toString(), parseToSec(process.env.RESET_TOKEN_EXPIRES_IN!));

    await this.email.sendEmail({
      to: user.email,
      subject: "Reset password",
      message:
        "Your password reset link for Instrimate is:" +
        `\n${process.env.CLIENT_URL}/reset-password?token=${resetToken}\n` +
        "Please don't share it with anyone",
    });
  }

  async resetPassword(input: ResetPasswordInput) {
    const key = `reset:${hashToken(input.resetToken)}`;
    const userId = await this.redis.get(key);
    if (!userId) throw new AppError("Invalid or expired reset token", 401);

    await this.redis.del(key);

    const user = await this.usersService.getById(userId);
    await this.usersService.resetPassword(user.id, input.newPassword);
    await this.sessionService.revokeAll(user.id);
  }

  async confirmPassword(input: ConfirmPasswordInput, email: string) {
    const user = await this.usersService.verifyPassword(email, input.password);
    if (!user) throw new AppError("Email or password was incorrect", 401);

    const sudoToken = generateSudoToken();
    const sudoKey = `sudo:${hashToken(sudoToken)}`;
    await this.redis.set(sudoKey, user.id, parseToSec(process.env.SUDO_TOKEN_EXPIRES_IN!));
    return sudoToken;
  }
}
