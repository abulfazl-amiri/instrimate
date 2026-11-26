import { Module } from "@nestjs/common";

import {
  AccessTokenGuard,
  AdminGuard,
  RefreshTokenGuard,
  SudoTokenGuard,
} from "./auth.guards.js";
import { RedisModule } from "../../infrastructure/redis/redis.module.js";

@Module({
  imports: [RedisModule],
  providers: [AccessTokenGuard, AdminGuard, RefreshTokenGuard, SudoTokenGuard],
  exports: [AccessTokenGuard, AdminGuard, RefreshTokenGuard, SudoTokenGuard],
})
export class SecurityModule {}
