import type { Response } from "express";

export const authCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "strict" as const,
};

export function clearRefreshTokenCookie(response: Response): void {
  response.clearCookie("refreshToken", authCookieOptions);
}

export function clearSudoTokenCookie(response: Response): void {
  response.clearCookie("sudoToken", authCookieOptions);
}

export function clearAuthCookies(response: Response): void {
  clearRefreshTokenCookie(response);
  clearSudoTokenCookie(response);
}
