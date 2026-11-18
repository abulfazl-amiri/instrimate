import { Module } from "@nestjs/common";

import { AccessTokenGuard, AdminGuard, RefreshTokenGuard } from "./auth.guards.js";

@Module({
  providers: [AccessTokenGuard, AdminGuard, RefreshTokenGuard],
  exports: [AccessTokenGuard, AdminGuard, RefreshTokenGuard],
})
export class SecurityModule {}
