import { Injectable } from "@nestjs/common";
import crypto from "node:crypto";

import { RedisService } from "../../redis/redis.service.js";
import * as tokenUtils from "../../utils/token.util.js";
import { parseToSec } from "../../utils/parser.util.js";

type CreateSessionInput = {
  userId: string;
  ip?: string;
  userAgent?: string;
};

type Session = {
  sessionId: string;
  userId: string;
  userAgent?: string;
  ip?: string;
};

@Injectable()
export class SessionService {
  constructor(private readonly redis: RedisService) {}

  private generateSessionId(): string {
    return crypto.randomUUID();
  }

  private async deleteCustomSessions(userId: string, sessionKeys: string[]): Promise<void> {
    const userKey = `user-sessions:${userId}`;

    const sessions = await Promise.all(sessionKeys.map((key) => this.redis.hgetall(key)));
    const sessionIdKeys = sessions
      .filter((session) => session.sessionId)
      .map((session) => `session-id:${session.sessionId}`);

    await this.redis.del(...sessionIdKeys, userKey, ...sessionKeys);
  }

  async createSession({ userId, ip, userAgent }: CreateSessionInput) {
    const accessToken = tokenUtils.signAccessToken(userId);
    const refreshToken = tokenUtils.generateRefreshToken();

    const sessionKey = `session:${tokenUtils.hashToken(refreshToken)}`;
    const sessionId = this.generateSessionId();
    const sessionExpireTimeInSec = parseToSec(process.env.REFRESH_TOKEN_EXPIRES_IN!);

    const sessionFields: Record<string, string> = {
      sessionId,
      userId,
    };
    if (userAgent !== undefined) sessionFields.userAgent = userAgent;
    if (ip !== undefined) sessionFields.ip = ip;

    await this.redis.hset(sessionKey, sessionFields);
    await this.redis.expire(sessionKey, sessionExpireTimeInSec);

    const userKey = `user-sessions:${userId}`;
    await this.redis.sadd(userKey, sessionKey);

    const sessionIdKey = `session-id:${sessionId}`;
    await this.redis.set(sessionIdKey, sessionKey, sessionExpireTimeInSec);

    return { accessToken, refreshToken };
  }

  async validateSession(refreshToken: string): Promise<Session | undefined> {
    const key = `session:${tokenUtils.hashToken(refreshToken)}`;
    const session = await this.redis.hgetall(key);
    if (!session.sessionId || !session.userId || Object.keys(session).length === 0) return;
    return {
      ...session,
      sessionId: session.sessionId,
      userId: session.userId,
    };
  }

  async deleteSession(refreshToken: string): Promise<void> {
    const sessionKey = `session:${tokenUtils.hashToken(refreshToken)}`;
    const session = await this.redis.hgetall(sessionKey);
    if (!session.userId || !session.sessionId) return;

    const userKey = `user-sessions:${session.userId}`;
    const sessionIdKey = `session-id:${session.sessionId}`;

    await this.redis.srem(userKey, sessionKey);
    await this.redis.del(sessionIdKey, sessionKey);
  }

  async revokeAll(userId: string): Promise<number> {
    const userKey = `user-sessions:${userId}`;
    const sessionKeys = await this.redis.smembers(userKey);

    await this.deleteCustomSessions(userId, sessionKeys);

    return sessionKeys.length;
  }
}
