import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { App } from "supertest/types.js";

import AppModule from "../../src/app.module.js";
import { configureApp } from "../../src/app.setup.js";
import { PrismaService } from "../../src/database/prisma.service.js";
import { EmailService } from "../../src/infrastructure/email/email.service.js";
import { RedisService } from "../../src/infrastructure/redis/redis.service.js";
import { FakeEmailService } from "./fake-email.js";

export type TestApp = {
  app: INestApplication;
  http: App;
  prisma: PrismaService;
  redis: RedisService;
  inbox: FakeEmailService;
  /** Empty every table and the test Redis database, and clear the inbox. */
  reset(): Promise<void>;
  close(): Promise<void>;
};

/** Boots the real AppModule against the test database, with email captured. */
export async function createTestApp(): Promise<TestApp> {
  const inbox = new FakeEmailService();
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(EmailService)
    .useValue(inbox)
    .compile();

  const app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.init();

  const prisma = app.get(PrismaService);
  const redis = app.get(RedisService);

  return {
    app,
    http: app.getHttpServer() as App,
    prisma,
    redis,
    inbox,
    async reset() {
      const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables
        WHERE schemaname = current_schema() AND tablename <> '_prisma_migrations'
      `;
      if (tables.length > 0) {
        const list = tables.map(({ tablename }) => `"${tablename}"`).join(", ");
        await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
      }
      await redis.getClient().flushdb();
      inbox.clear();
    },
    async close() {
      await app.close();
    },
  };
}
