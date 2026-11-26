import { Injectable } from "@nestjs/common";
import crypto from "node:crypto";

import { signAccessToken } from "../../common/security/jwt.util.js";
import { RedisService } from "../../infrastructure/redis/redis.service.js";
import * as tokenUtils from "../../common/security/token.util.js";
import { parseToSec } from "../../common/utils/duration.util.js";

type CreateSessionInput = {
  userId: string;
  ip?: string;
  userAgent?: string;
  sessionId?: string;
  createdAt?: string;
};

type Session = {
  sessionId: string;
  userId: string;
  userAgent?: string;
  ip?: string;
  createdAt?: string;
  lastRefreshedAt?: string;
};

export type SessionSummary = {
  sessionId: string;
  userAgent?: string;
  ip?: string;
  createdAt: Date | null;
  lastRefreshedAt: Date | null;
  current: boolean;
};

export type SessionRevocationResult = {
  sessionsRevoked: number;
  currentSessionRevoked: boolean;
};

@Injectable()
export class SessionService {
  constructor(private readonly redis: RedisService) {}

  private generateSessionId(): string {
    return crypto.randomUUID();
  }

  private parseDate(value?: string): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  async createSession({
    userId,
    ip,
    userAgent,
    sessionId: existingSessionId,
    createdAt: existingCreatedAt,
  }: CreateSessionInput) {
    const sessionId = existingSessionId ?? this.generateSessionId();
    const now = new Date().toISOString();
    const accessToken = signAccessToken(userId, sessionId);
    const refreshToken = tokenUtils.generateRefreshToken();

    const sessionKey = `session:${tokenUtils.hashToken(refreshToken)}`;
    const sessionExpireTimeInSec = parseToSec(process.env.REFRESH_TOKEN_EXPIRES_IN!);

    const sessionFields: Record<string, string> = {
      sessionId,
      userId,
      createdAt: existingCreatedAt ?? now,
      lastRefreshedAt: now,
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
      createdAt: session.createdAt,
      lastRefreshedAt: session.lastRefreshedAt,
    };
  }

  async listSessions(userId: string, currentSessionId: string): Promise<SessionSummary[]> {
    const userKey = `user-sessions:${userId}`;
    const sessionKeys = await this.redis.smembers(userKey);
    const sessionRecords = await Promise.all(
      sessionKeys.map(async (key) => ({
        key,
        session: await this.redis.hgetall(key),
      })),
    );
    const sessionIndexes = await Promise.all(
      sessionRecords.map(({ session }) =>
        session.sessionId ? this.redis.get(`session-id:${session.sessionId}`) : null,
      ),
    );

    const staleKeys: string[] = [];
    const result: SessionSummary[] = [];
    for (const [index, { key, session }] of sessionRecords.entries()) {
      if (
        !session.sessionId ||
        session.userId !== userId ||
        sessionIndexes[index] !== key
      ) {
        staleKeys.push(key);
        continue;
      }

      result.push({
        sessionId: session.sessionId,
        userAgent: session.userAgent,
        ip: session.ip,
        createdAt: this.parseDate(session.createdAt),
        lastRefreshedAt: this.parseDate(session.lastRefreshedAt),
        current: session.sessionId === currentSessionId,
      });
    }

    if (staleKeys.length > 0) await this.redis.srem(userKey, ...staleKeys);
    return result.sort(
      (a, b) => (b.lastRefreshedAt?.getTime() ?? 0) - (a.lastRefreshedAt?.getTime() ?? 0),
    );
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

  async revokeSession(
    userId: string,
    sessionId: string,
    currentSessionId: string,
  ): Promise<SessionRevocationResult> {
    const userKey = `user-sessions:${userId}`;
    const sessionKeys = await this.redis.smembers(userKey);
    const sessionRecords = await Promise.all(
      sessionKeys.map(async (key) => ({
        key,
        session: await this.redis.hgetall(key),
      })),
    );
    const revokeKeys = sessionRecords
      .filter(({ session }) => session.userId === userId && session.sessionId === sessionId)
      .map(({ key }) => key);

    const sessionIdKey = `session-id:${sessionId}`;
    const indexedSessionKey = await this.redis.get(sessionIdKey);
    if (indexedSessionKey && !revokeKeys.includes(indexedSessionKey)) {
      const indexedSession = await this.redis.hgetall(indexedSessionKey);
      if (indexedSession.userId === userId && indexedSession.sessionId === sessionId) {
        revokeKeys.push(indexedSessionKey);
      }
    }

    if (revokeKeys.length === 0) {
      return { sessionsRevoked: 0, currentSessionRevoked: false };
    }

    await this.redis.srem(userKey, ...revokeKeys);
    await this.redis.del(sessionIdKey, ...revokeKeys);

    return {
      sessionsRevoked: 1,
      currentSessionRevoked: sessionId === currentSessionId,
    };
  }

  async revokeSessions(
    userId: string,
    currentSessionId: string,
    includeCurrentSession: boolean,
  ): Promise<SessionRevocationResult> {
    const userKey = `user-sessions:${userId}`;
    const sessionKeys = await this.redis.smembers(userKey);
    const sessionRecords = await Promise.all(
      sessionKeys.map(async (key) => ({
        key,
        session: await this.redis.hgetall(key),
      })),
    );

    const staleKeys: string[] = [];
    const revokeRecords: Array<{ key: string; sessionId: string }> = [];
    for (const { key, session } of sessionRecords) {
      if (!session.sessionId || session.userId !== userId) {
        staleKeys.push(key);
        continue;
      }
      if (includeCurrentSession || session.sessionId !== currentSessionId) {
        revokeRecords.push({ key, sessionId: session.sessionId });
      }
    }

    if (staleKeys.length > 0) await this.redis.srem(userKey, ...staleKeys);
    if (revokeRecords.length > 0) {
      await this.redis.srem(userKey, ...revokeRecords.map(({ key }) => key));
      await this.redis.del(
        ...revokeRecords.map(({ sessionId }) => `session-id:${sessionId}`),
        ...revokeRecords.map(({ key }) => key),
      );
    }

    return {
      sessionsRevoked: revokeRecords.length,
      currentSessionRevoked: revokeRecords.some(
        ({ sessionId }) => sessionId === currentSessionId,
      ),
    };
  }

  async revokeAll(userId: string): Promise<number> {
    const result = await this.revokeSessions(userId, "", true);
    return result.sessionsRevoked;
  }
}
