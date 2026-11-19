import crypto from "node:crypto";

import * as tokenUtils from "../../utils/token.util.js";
import { parseToSec } from "../../utils/parser.util.js";
import redis from "../../config/redis.js";

const generateSessionId = function () {
  return crypto.randomUUID();
};

const deleteCustomSessions = async function (userId, sessionKeys) {
  const userKey = `user-sessions:${userId.toString()}`;

  const sessions = await Promise.all(sessionKeys.map((key) => redis.hgetall(key)));
  const sessionIdKeys = sessions
    .filter((session) => session?.sessionId)
    .map((session) => `session-id:${session.sessionId}`);

  await redis.del(...sessionIdKeys, userKey, ...sessionKeys);
};

const createSession = async function ({ userId, ip, userAgent }) {
  const accessToken = tokenUtils.signAccessToken(userId);
  const refreshToken = tokenUtils.generateRefreshToken();

  const sessionKey = `session:${tokenUtils.hashToken(refreshToken)}`;
  const sessionId = generateSessionId();
  const sessionExpireTimeInSec = parseToSec(process.env.REFRESH_TOKEN_EXPIRES_IN);

  await redis.hset(sessionKey, {
    sessionId,
    userId: userId.toString(),
    userAgent,
    ip,
  });
  await redis.expire(sessionKey, sessionExpireTimeInSec);

  const userKey = `user-sessions:${userId.toString()}`;
  await redis.sadd(userKey, sessionKey);

  const sessionIdKey = `session-id:${sessionId}`;
  await redis.set(sessionIdKey, sessionKey, "EX", sessionExpireTimeInSec);

  return { accessToken, refreshToken };
};

const validateSession = async function (refreshToken) {
  const key = `session:${tokenUtils.hashToken(refreshToken)}`;
  const session = await redis.hgetall(key);
  if (!session?.sessionId || !session?.userId || Object.keys(session).length === 0) return;
  return session;
};

const deleteSession = async function (refreshToken) {
  const sessionKey = `session:${tokenUtils.hashToken(refreshToken)}`;
  const session = await redis.hgetall(sessionKey);
  if (!session?.userId || !session?.sessionId) return;

  const userKey = `user-sessions:${session.userId}`;
  const sessionIdKey = `session-id:${session.sessionId}`;

  await redis.srem(userKey, sessionKey);
  await redis.del(sessionIdKey, sessionKey);
};

const revokeAll = async function (userId) {
  const userKey = `user-sessions:${userId.toString()}`;
  const sessionKeys = await redis.smembers(userKey);

  await deleteCustomSessions(userId, sessionKeys);

  return sessionKeys.length;
};

export { createSession, validateSession, deleteSession, revokeAll };
