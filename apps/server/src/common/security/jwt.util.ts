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

export function signAccessToken(userId: string, sessionId: string): string {
  return generateToken(
    { sub: userId.toString(), sid: sessionId },
    process.env.JWT_SECRET!,
    process.env.JWT_EXPIRES_IN! as SignOptions["expiresIn"],
  );
}

export function verifyAccessToken(token: string): string | JwtPayload {
  return jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ["HS256"] });
}
