import { VersioningType, type INestApplication } from "@nestjs/common";
import cookieParser from "cookie-parser";

import { ApiExceptionFilter } from "./common/filters/api-exception.filter.js";

/**
 * Applies the HTTP setup shared by the real server and the integration tests:
 * CORS, cookies, the global error filter, the `/api` prefix and URI versioning.
 */
export function configureApp(app: INestApplication): INestApplication {
  const configuredOrigins = process.env.CORS_ORIGINS
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
    .map((origin) => new URL(origin).origin);
  const allowedOrigins = [
    "https://studio.apollographql.com",
    "https://sandbox.embed.apollographql.com",
    ...(configuredOrigins ?? []),
    ...(process.env.CLIENT_URL ? [new URL(process.env.CLIENT_URL).origin] : []),
  ];
  app.enableCors({ origin: allowedOrigins, credentials: true });
  app.use(cookieParser());
  app.useGlobalFilters(new ApiExceptionFilter());

  app.setGlobalPrefix("api");
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: "1",
  });

  return app;
}
