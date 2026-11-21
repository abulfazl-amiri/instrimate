import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { Redis } from "ioredis";

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly client: Redis;

  constructor() {
    this.client = new Redis(process.env.REDIS_URL!);
    this.client.on("connect", () => console.log("Redis connected"));
    this.client.on("error", (error: Error) => console.error("Redis connection failed:", error));
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
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
}
