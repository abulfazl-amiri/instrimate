import { Module } from "@nestjs/common";

import { SessionService } from "./session.service.js";
import { RedisModule } from "../../infrastructure/redis/redis.module.js";

@Module({
  imports: [RedisModule],
  providers: [SessionService],
  exports: [SessionService],
})
export class SessionModule {}
