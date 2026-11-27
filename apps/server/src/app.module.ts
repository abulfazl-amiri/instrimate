import { Module } from "@nestjs/common";
import { ApolloDriver, type ApolloDriverConfig } from "@nestjs/apollo";
import { GraphQLModule } from "@nestjs/graphql";
import { join } from "node:path";
import type { Request, Response } from "express";

import { AppController } from "./app.controller.js";
import { AppResolver } from "./app.resolver.js";
import { PrismaModule } from "./database/prisma.module.js";
import { AuthModule } from "./features/auth/auth.module.js";
import { ClassesModule } from "./features/classes/classes.module.js";
import { UsersModule } from "./features/users/users.module.js";

@Module({
  imports: [
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), "schema.gql"),
      sortSchema: true,
      context: ({ req, res }: { req: Request; res: Response }) => ({ req, res }),
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ClassesModule,
  ],
  controllers: [AppController],
  providers: [AppResolver],
})
export default class AppModule {}
