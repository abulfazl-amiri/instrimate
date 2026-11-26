import { Module } from "@nestjs/common";

import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { UsersModule } from "../users/users.module.js";
import { SecurityModule } from "../../common/security/security.module.js";
import { SessionModule } from "./session.module.js";
import { EmailModule } from "../../infrastructure/email/email.module.js";
import { RedisModule } from "../../infrastructure/redis/redis.module.js";
import { SessionsResolver } from "./sessions.resolver.js";

@Module({
  imports: [UsersModule, SecurityModule, SessionModule, EmailModule, RedisModule],
  controllers: [AuthController],
  providers: [AuthService, SessionsResolver],
})
export class AuthModule {}
