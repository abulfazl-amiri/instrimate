import crypto from "node:crypto";

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
