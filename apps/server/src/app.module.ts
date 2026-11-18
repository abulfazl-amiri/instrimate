import { Module } from "@nestjs/common";

import { AuthModule } from "./features/auth/auth.module.js";

@Module({
  imports: [AuthModule],
})
export default class AppModule {}
