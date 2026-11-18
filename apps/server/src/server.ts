import "reflect-metadata";
import "dotenv/config.js";

import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import type { Express, NextFunction, Request, Response } from "express";

import appModule from "./app.module.js";
import legacyApp from "./app.js";

const bootstrap = async function () {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) throw new Error("MONGO_URI must be configured");

    await mongoose.connect(mongoUri);
    console.log("DB connected");
  } catch (err) {
    console.error("DB connection failed: ", err);
    process.exit(1);
  }

  const nestApp = await NestFactory.create(appModule, new ExpressAdapter());
  const expressApp: Express = nestApp.getHttpAdapter().getInstance();

  expressApp.use(cookieParser());
  expressApp.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === "/api/v1/auth" || req.path.startsWith("/api/v1/auth/")) {
      next();
      return;
    }

    legacyApp(req, res, next);
  });

  const port = process.env.PORT || 3000;
  await nestApp.listen(port);
  console.log(`Server is running on port ${port}`);
};

void bootstrap();
