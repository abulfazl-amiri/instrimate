import { Injectable } from "@nestjs/common";
import { timingSafeEqual } from "node:crypto";
import { RedisService } from "../../infrastructure/redis/redis.service.js";
import AppError from "../../common/errors/app-error.js";
import {
  generateResetToken,
  generateSudoToken,
  hashToken,
} from "../../common/security/token.util.js";
import {
  generateVerificationCode,
  hashVerificationCode,
} from "../../common/security/verification-code.util.js";
import { EmailService } from "../../infrastructure/email/email.service.js";
import { parseToSec } from "../../common/utils/duration.util.js";
import { UsersService } from "../users/users.service.js";
import * as PasswordUtils from "../../common/utils/password.util.js";
import { SessionService } from "./session.service.js";
import { createPasswordResetEmailTemplate } from "../../templates/auth/password-reset-email.template.js";
import { createVerificationEmailTemplate } from "../../templates/auth/verification-email.template.js";
import type {
  ConfirmPasswordInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  SigninInput,
  SignupInput,
  VerifyEmailInput,
} from "./auth.schema.js";

type ClientMetadata = {
  ip?: string;
  userAgent?: string;
};

const verificationCodeTtlSeconds = Number(
  process.env.EMAIL_VERIFICATION_CODE_TTL_SECONDS ?? 10 * 60,
);
const verificationResendCooldownSeconds = Number(
  process.env.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS ?? 60,
);
const verificationMaxAttempts = Number(process.env.EMAIL_VERIFICATION_MAX_ATTEMPTS ?? 5);
const passwordResetRequestCooldownSeconds = Number(
  process.env.PASSWORD_RESET_REQUEST_COOLDOWN_SECONDS ?? 60,
);

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionService: SessionService,
    private readonly redis: RedisService,
    private readonly email: EmailService,
  ) {}

  async signup(input: SignupInput): Promise<void> {
    const existingUser = await this.usersService.findByEmail(input.email);
    if (existingUser) throw new AppError("Email is already in use", 409);

    const passwordHash = await PasswordUtils.hash(input.password);

    const user = await this.usersService.createUser({
      name: input.name,
      email: input.email,
      passwordHash: passwordHash,
    });

    await this.sendVerificationCode(user.id, user.email);
  }

  async verifyEmail(input: VerifyEmailInput, metadata: ClientMetadata) {
    const user = await this.usersService.findByEmail(input.email);
    if (!user || user.status !== "ACTIVE" || user.emailVerifiedAt) {
      throw new AppError("Invalid or expired verification code", 401);
    }

    const codeKey = `email-verification:${user.id}`;
    const attemptsKey = `email-verification-attempts:${user.id}`;
    const storedHash = await this.redis.get(codeKey);
    if (!storedHash) throw new AppError("Invalid or expired verification code", 401);

    const attempts = await this.redis.incr(attemptsKey);
    if (attempts === 1) await this.redis.expire(attemptsKey, verificationCodeTtlSeconds);
    if (attempts > verificationMaxAttempts) {
      await this.redis.del(codeKey, attemptsKey);
      throw new AppError("Invalid or expired verification code", 401);
    }

    const candidateHash = hashVerificationCode(user.id, input.code);
    const storedHashBuffer = Buffer.from(storedHash, "hex");
    const candidateHashBuffer = Buffer.from(candidateHash, "hex");
    if (
      storedHashBuffer.length !== candidateHashBuffer.length ||
      !timingSafeEqual(storedHashBuffer, candidateHashBuffer)
    ) {
      if (attempts === verificationMaxAttempts) await this.redis.del(codeKey);
      throw new AppError("Invalid or expired verification code", 401);
    }

    const verified = await this.usersService.verifyEmail(user.id);
    await this.redis.del(codeKey, attemptsKey);
    if (!verified) throw new AppError("Email is already verified", 409);

    return this.sessionService.createSession({
      userId: user.id,
      ip: metadata.ip,
      userAgent: metadata.userAgent,
    });
  }

  async resendVerificationCode(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.status !== "ACTIVE" || user.emailVerifiedAt) return;

    await this.sendVerificationCode(user.id, user.email);
  }

  async signin(input: SigninInput, metadata: ClientMetadata) {
    const user = await this.usersService.verifyPassword(input.email, input.password);
    if (!user) throw new AppError("Email or password was incorrect", 401);
    if (user.status !== "ACTIVE") throw new AppError("Account is not active", 403);
    if (!user.emailVerifiedAt) throw new AppError("Email must be verified before signing in", 403);

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
    if (user.status !== "ACTIVE") throw new AppError("Account is not active", 403);
    if (!user.emailVerifiedAt) throw new AppError("Email must be verified before signing in", 403);

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

    const cooldownKey = `password-reset-request:${user.id}`;
    const claimedCooldown = await this.redis.setIfAbsent(
      cooldownKey,
      "1",
      passwordResetRequestCooldownSeconds,
    );
    if (!claimedCooldown) return;

    const resetToken = generateResetToken();
    const key = `reset:${hashToken(resetToken)}`;
    const resetTokenTtlSeconds = parseToSec(process.env.RESET_TOKEN_EXPIRES_IN!);
    await this.redis.set(key, user.id.toString(), resetTokenTtlSeconds);
    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;

    try {
      await this.email.sendEmail({
        to: user.email,
        ...createPasswordResetEmailTemplate(resetUrl, resetTokenTtlSeconds),
      });
    } catch (error) {
      await this.redis.del(key, cooldownKey);
      throw new AppError("Unable to send password reset email", 503, { cause: error });
    }
  }

  async resetPassword(input: ResetPasswordInput) {
    const key = `reset:${hashToken(input.resetToken)}`;
    const userId = await this.redis.get(key);
    if (!userId) throw new AppError("Invalid or expired reset token", 401);

    if (await this.usersService.matchesCurrentPassword(userId, input.newPassword)) {
      throw new AppError("New password must be different from your current password", 422);
    }

    const passwordHash = await PasswordUtils.hash(input.newPassword);
    await this.redis.del(key);
    await this.usersService.resetPassword(userId, passwordHash);
    await this.sessionService.revokeAll(userId);
  }

  async confirmPassword(input: ConfirmPasswordInput, email: string) {
    const user = await this.usersService.verifyPassword(email, input.password);
    if (!user) throw new AppError("Email or password was incorrect", 401);

    const sudoToken = generateSudoToken();
    const sudoKey = `sudo:${hashToken(sudoToken)}`;
    await this.redis.set(sudoKey, user.id, parseToSec(process.env.SUDO_TOKEN_EXPIRES_IN!));
    return sudoToken;
  }

  private async sendVerificationCode(userId: string, email: string): Promise<void> {
    const cooldownKey = `email-verification-resend:${userId}`;
    const claimedCooldown = await this.redis.setIfAbsent(
      cooldownKey,
      "1",
      verificationResendCooldownSeconds,
    );
    if (!claimedCooldown) return;

    const code = generateVerificationCode();
    const codeKey = `email-verification:${userId}`;
    const attemptsKey = `email-verification-attempts:${userId}`;

    await this.redis.set(
      codeKey,
      hashVerificationCode(userId, code),
      verificationCodeTtlSeconds,
    );
    await this.redis.del(attemptsKey);
    try {
      await this.email.sendEmail({
        to: email,
        ...createVerificationEmailTemplate(code, verificationCodeTtlSeconds),
      });
    } catch (error) {
      await this.redis.del(codeKey, attemptsKey, cooldownKey);
      throw new AppError("Unable to send verification code", 503, { cause: error });
    }
  }
}
