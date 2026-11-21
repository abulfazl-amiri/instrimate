import { Module } from "@nestjs/common";

import { SecurityModule } from "../../common/security/security.module.js";
import { UsersController } from "./users.controller.js";
import { UsersService } from "./users.service.js";
import { SessionModule } from "../auth/session.module.js";

@Module({
  imports: [SecurityModule, SessionModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
