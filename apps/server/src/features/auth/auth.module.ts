import { Module } from "@nestjs/common";

import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { UsersModule } from "../users/users.module.js";
import { SecurityModule } from "../../common/security/security.module.js";
import { SessionModule } from "./session.module.js";

@Module({
  imports: [UsersModule, SecurityModule, SessionModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
