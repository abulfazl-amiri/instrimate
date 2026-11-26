import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Redis } from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL!);
    this.client.on("connect", () => console.log("Redis connected"));
    this.client.on("error", (e: Error) => console.error("Redis error:", e));
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  getClient(): Redis {
    return this.client;
  }

  get(key: string) {
    return this.client.get(key);
  }

  set(key: string, value: string, expiresInSeconds?: number) {
    if (expiresInSeconds === undefined) return this.client.set(key, value);
    return this.client.set(key, value, "EX", expiresInSeconds);
  }

  del(...keys: string[]) {
    return this.client.del(...keys);
  }

  incr(key: string) {
    return this.client.incr(key);
  }

  hgetall(key: string) {
    return this.client.hgetall(key);
  }

  hset(key: string, fields: Record<string, string>) {
    return this.client.hset(key, fields);
  }

  expire(key: string, seconds: number) {
    return this.client.expire(key, seconds);
  }

  sadd(key: string, ...members: string[]) {
    return this.client.sadd(key, ...members);
  }

  srem(key: string, ...members: string[]) {
    return this.client.srem(key, ...members);
  }

  smembers(key: string) {
    return this.client.smembers(key);
  }

  async getJson<T>(key: string): Promise<T | null> {
    const raw = await this.client.get(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null; // corrupted value: treat as a miss
    }
  }

  async setJson(key: string, value: unknown, ttlSeconds?: number) {
    const raw = JSON.stringify(value);
    return ttlSeconds === undefined
      ? this.client.set(key, raw)
      : this.client.set(key, raw, "EX", ttlSeconds);
  }

  // true if the key was set, false if it already existed (locks, idempotency keys)
  async setIfAbsent(key: string, value: string, ttlSeconds: number) {
    return (await this.client.set(key, value, "EX", ttlSeconds, "NX")) === "OK";
  }

  async consumeIfValue(key: string, value: string): Promise<boolean> {
    const result = await this.client.eval(
      "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0",
      1,
      key,
      value,
    );
    return Number(result) === 1;
  }
}
