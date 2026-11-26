import { Module } from "@nestjs/common";

import { SecurityModule } from "../../common/security/security.module.js";
import { UsersResolver } from "./users.resolver.js";
import { UsersService } from "./users.service.js";
import { SessionModule } from "../auth/session.module.js";
import { RedisModule } from "../../infrastructure/redis/redis.module.js";

@Module({
  imports: [SecurityModule, SessionModule, RedisModule],
  providers: [UsersResolver, UsersService],
  exports: [UsersService],
})
export class UsersModule {}
