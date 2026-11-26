import crypto from "node:crypto";

export function generateVerificationCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashVerificationCode(userId: string, code: string): string {
  return crypto
    .createHmac("sha256", process.env.JWT_SECRET!)
    .update(`${userId}:${code}`)
    .digest("hex");
}
