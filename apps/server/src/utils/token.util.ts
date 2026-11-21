import crypto from "node:crypto";

import jwt, { type JwtPayload, type Secret, type SignOptions } from "jsonwebtoken";

const generateToken = function (
  payload: string | Buffer | object,
  secretKey: Secret,
  expiresIn: SignOptions["expiresIn"],
): string {
  return jwt.sign(payload, secretKey, {
    algorithm: "HS256",
    expiresIn,
  });
};

const signAccessToken = function (userId: string): string {
  return generateToken(
    { sub: userId.toString() },
    process.env.JWT_SECRET!,
    process.env.JWT_EXPIRES_IN! as SignOptions["expiresIn"],
  );
};

const generateRefreshToken = function (): string {
  return crypto.randomBytes(32).toString("hex");
};
const generateResetToken = function (): string {
  return crypto.randomBytes(32).toString("hex");
};
const generateSudoToken = function (): string {
  return crypto.randomBytes(32).toString("hex");
};

const hashToken = function (rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
};

const verifyAccessToken = function (token: string): string | JwtPayload {
  return jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ["HS256"] });
};

export {
  signAccessToken,
  generateRefreshToken,
  generateResetToken,
  verifyAccessToken,
  hashToken,
  generateSudoToken,
};
