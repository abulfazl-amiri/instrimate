import { Module } from "@nestjs/common";

import { SecurityModule } from "../../common/security/security.module.js";
import { ClassesResolver } from "./classes.resolver.js";
import { ClassesService } from "./classes.service.js";

@Module({
  imports: [SecurityModule],
  providers: [ClassesResolver, ClassesService],
  exports: [ClassesService],
})
export class ClassesModule {}
