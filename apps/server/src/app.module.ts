import { Module } from "@nestjs/common";

import { AppController } from "./app.controller.js";
import { PrismaModule } from "./database/prisma.module.js";
import { AuthModule } from "./features/auth/auth.module.js";
import { UsersModule } from "./features/users/users.module.js";

@Module({
  imports: [PrismaModule, AuthModule, UsersModule],
  controllers: [AppController],
})
export default class AppModule {}
