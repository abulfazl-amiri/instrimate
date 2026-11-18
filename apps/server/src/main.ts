import "reflect-metadata";
import "dotenv/config.js";

import { NestFactory } from "@nestjs/core";
import cookieParser from "cookie-parser";

import AppModule from "./app.module.js";
import { ApiExceptionFilter } from "./common/filters/api-exception.filter.js";

const bootstrap = async function () {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalFilters(new ApiExceptionFilter());
  app.enableShutdownHooks();

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Server is running on port ${port}`);
};

void bootstrap();
