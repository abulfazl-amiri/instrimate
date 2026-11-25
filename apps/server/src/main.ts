import "reflect-metadata";
import "dotenv/config.js";

import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";

import AppModule from "./app.module.js";
import { ApiExceptionFilter } from "./common/filters/api-exception.filter.js";
import { VersioningType } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = [
    "https://studio.apollographql.com",
    "https://sandbox.embed.apollographql.com",
    ...(process.env.CLIENT_URL ? [new URL(process.env.CLIENT_URL).origin] : []),
  ];
  app.enableCors({ origin: allowedOrigins, credentials: true });
  app.use(cookieParser());
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();

  app.setGlobalPrefix("api");
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });

  const port = process.env.PORT || 3000;
  const host = process.env.HOST || "0.0.0.0";
  await app.listen(port, host);
  console.log(`Server is running on port ${port}`);
}

void bootstrap();
