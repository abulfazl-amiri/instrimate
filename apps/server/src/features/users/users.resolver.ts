import { Args, ID, Mutation, Query, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";

import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import {
  AccessTokenGuard,
  AdminGuard,
} from "../../common/security/auth.guards.js";
import { CurrentUser } from "../../common/security/current-user.decorator.js";
import type { AuthUser } from "../../common/security/auth-user.type.js";
import {
  changePasswordSchema,
  updateRoleSchema,
  updateMeSchema,
  updateSchema,
  userFilterSchema,
  userIdSchema,
} from "./user.schema.js";
import { UsersService } from "./users.service.js";
import {
  ChangePasswordInput,
  UpdateRoleInput,
  UpdateMeInput,
  UpdateUserInput,
  User,
  UserFilterInput,
  UsersResult,
} from "./user.graphql.js";

@Resolver()
@UseGuards(AccessTokenGuard)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => User)
  me(@CurrentUser() user: AuthUser) {
    return this.usersService.getById(user.id);
  }

  @Mutation(() => User)
  updateMe(
    @CurrentUser() user: AuthUser,
    @Args("input", new ZodValidationPipe(updateMeSchema)) input: UpdateMeInput,
  ) {
    return this.usersService.updateById(user.id, input);
  }

  @Mutation(() => Boolean)
  async deleteMe(@CurrentUser() user: AuthUser): Promise<boolean> {
    await this.usersService.deleteById(user.id);
    return true;
  }

  @Mutation(() => Boolean)
  async changeMyPassword(
    @CurrentUser() user: AuthUser,
    @Args("input", new ZodValidationPipe(changePasswordSchema)) input: ChangePasswordInput,
  ): Promise<boolean> {
    await this.usersService.changePassword(user.id, input);
    return true;
  }

  @Query(() => UsersResult)
  @UseGuards(AdminGuard)
  async users(
    @Args(
      "filter",
      { type: () => UserFilterInput, nullable: true },
      new ZodValidationPipe(userFilterSchema),
    )
    filter?: UserFilterInput | null,
  ): Promise<UsersResult> {
    return this.usersService.getFilteredUsers(filter ?? {});
  }

  @Query(() => User)
  @UseGuards(AdminGuard)
  user(
    @Args("id", { type: () => ID }, new ZodValidationPipe(userIdSchema)) id: string,
  ) {
    return this.usersService.getById(id);
  }

  @Mutation(() => User)
  @UseGuards(AdminGuard)
  updateUser(
    @Args("id", { type: () => ID }, new ZodValidationPipe(userIdSchema)) id: string,
    @Args("input", new ZodValidationPipe(updateSchema)) input: UpdateUserInput,
  ) {
    return this.usersService.updateById(id, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(AdminGuard)
  async deleteUser(
    @Args("id", { type: () => ID }, new ZodValidationPipe(userIdSchema)) id: string,
  ): Promise<boolean> {
    await this.usersService.deleteById(id);
    return true;
  }

  @Mutation(() => User)
  @UseGuards(AdminGuard)
  updateUserRole(
    @Args("id", { type: () => ID }, new ZodValidationPipe(userIdSchema)) id: string,
    @Args("input", new ZodValidationPipe(updateRoleSchema)) input: UpdateRoleInput,
  ) {
    return this.usersService.updateRole(id, input);
  }
}
