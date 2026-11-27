import { UseGuards } from "@nestjs/common";
import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";

import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import type { AuthUser } from "../../common/security/auth-user.type.js";
import { AccessTokenGuard } from "../../common/security/auth.guards.js";
import { CurrentUser } from "../../common/security/current-user.decorator.js";
import {
  Class,
  ClassFilterInput,
  ClassesResult,
  CreateClassInput,
  UpdateClassInput,
} from "./class.graphql.js";
import {
  classFilterSchema,
  classIdSchema,
  createClassSchema,
  updateClassSchema,
} from "./class.schema.js";
import { ClassesService } from "./classes.service.js";

@Resolver(() => Class)
@UseGuards(AccessTokenGuard)
export class ClassesResolver {
  constructor(private readonly classesService: ClassesService) {}

  @Query(() => ClassesResult)
  classes(
    @CurrentUser() user: AuthUser,
    @Args(
      "filter",
      { type: () => ClassFilterInput, nullable: true },
      new ZodValidationPipe(classFilterSchema),
    )
    filter?: ClassFilterInput | null,
  ): Promise<ClassesResult> {
    return this.classesService.getFiltered(user.id, filter ?? {});
  }

  @Query(() => Class)
  class(
    @CurrentUser() user: AuthUser,
    @Args("id", { type: () => ID }, new ZodValidationPipe(classIdSchema)) id: string,
  ) {
    return this.classesService.getById(user.id, id);
  }

  @Mutation(() => Class)
  createClass(
    @CurrentUser() user: AuthUser,
    @Args("input", new ZodValidationPipe(createClassSchema)) input: CreateClassInput,
  ) {
    return this.classesService.create(user.id, input);
  }

  @Mutation(() => Class)
  updateClass(
    @CurrentUser() user: AuthUser,
    @Args("id", { type: () => ID }, new ZodValidationPipe(classIdSchema)) id: string,
    @Args("input", new ZodValidationPipe(updateClassSchema)) input: UpdateClassInput,
  ) {
    return this.classesService.updateById(user.id, id, input);
  }

  @Mutation(() => Boolean)
  async deleteClass(
    @CurrentUser() user: AuthUser,
    @Args("id", { type: () => ID }, new ZodValidationPipe(classIdSchema)) id: string,
  ): Promise<boolean> {
    await this.classesService.deleteById(user.id, id);
    return true;
  }
}
