import crypto from "node:crypto";

import jwt, { type JwtPayload, type Secret, type SignOptions } from "jsonwebtoken";

function generateToken(
  payload: string | Buffer | object,
  secretKey: Secret,
  expiresIn: SignOptions["expiresIn"],
): string {
  return jwt.sign(payload, secretKey, {
    algorithm: "HS256",
    expiresIn,
  });
}

export function signAccessToken(userId: string): string {
  return generateToken(
    { sub: userId.toString() },
    process.env.JWT_SECRET!,
    process.env.JWT_EXPIRES_IN! as SignOptions["expiresIn"],
  );
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}
export function generateSudoToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export function verifyAccessToken(token: string): string | JwtPayload {
  return jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ["HS256"] });
};
