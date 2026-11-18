import { Injectable } from "@nestjs/common";

import * as userRepository from "../users/user.repository.js";
import * as userService from "../users/user.service.js";
import * as sessionService from "../sessions/session.service.js";
import redis from "../../config/redis.js";
import AppError from "../../utils/error.util.js";
import {
  generateResetToken,
  generateSudoToken,
  hashToken,
} from "../../utils/token.util.js";
import { sendEmail } from "../../utils/email.util.js";
import { parseToSec } from "../../utils/parser.util.js";
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
  async signup(input: SignupInput, metadata: ClientMetadata) {
    const foundEmail = await userRepository.findByEmail(input.email);
    if (foundEmail) throw new AppError("Email is already in use", 409);

    const user = await userService.createUser(input);
    return sessionService.createSession({
      userId: user.id,
      ip: metadata.ip,
      userAgent: metadata.userAgent,
    });
  }

  async signin(input: SigninInput, metadata: ClientMetadata) {
    const user = await userService.verifyPassword(input.email, input.password);
    if (!user) throw new AppError("Email or password was incorrect", 401);

    return sessionService.createSession({
      userId: user.id,
      ip: metadata.ip,
      userAgent: metadata.userAgent,
    });
  }

  async refresh(refreshToken: string, metadata: ClientMetadata) {
    const session = await sessionService.validateSession(refreshToken);
    if (!session) throw new AppError("Invalid or expired session", 401);

    const user = await userRepository.findById(session.userId);
    if (!user) throw new AppError("User not found", 404);

    await sessionService.deleteSession(refreshToken);
    return sessionService.createSession({
      userId: user.id,
      ip: metadata.ip,
      userAgent: metadata.userAgent,
    });
  }

  async logout(refreshToken: string) {
    await sessionService.deleteSession(refreshToken);
  }

  async forgotPassword(input: ForgotPasswordInput) {
    const user = await userService.userExist(input.email);
    if (!user) return;

    const resetToken = generateResetToken();
    const key = `reset:${hashToken(resetToken)}`;
    await redis.set(
      key,
      user.id.toString(),
      "EX",
      parseToSec(process.env.RESET_TOKEN_EXPIRES_IN),
    );

    await sendEmail({
      to: user.email,
      subject: "Reset password",
      message:
        "Your password reset link for classwise is:" +
        `\n${process.env.CLIENT_URL}/reset-password?token=${resetToken}\n` +
        "Please don't share it with anyone",
    });
  }

  async resetPassword(input: ResetPasswordInput) {
    const key = `reset:${hashToken(input.resetToken)}`;
    const userId = await redis.get(key);
    if (!userId) throw new AppError("Invalid or expired reset token", 401);

    await redis.del(key);

    const user = await userService.getById(userId);
    await userService.resetPassword(user.id, input.newPassword);
    await sessionService.revokeAll(user.id);
  }

  async confirmPassword(input: ConfirmPasswordInput, email: string) {
    const user = await userService.verifyPassword(email, input.password);
    if (!user) throw new AppError("Email or password was incorrect", 401);

    const sudoToken = generateSudoToken();
    const sudoKey = `sudo:${hashToken(sudoToken)}`;
    await redis.set(
      sudoKey,
      user.id,
      "EX",
      parseToSec(process.env.SUDO_TOKEN_EXPIRES_IN),
    );
    return sudoToken;
  }
}
