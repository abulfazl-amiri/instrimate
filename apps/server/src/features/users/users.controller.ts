import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";

import {
  AccessTokenGuard,
  AdminGuard,
} from "../../common/security/auth.guards.js";
import { CurrentUser } from "../../common/security/current-user.decorator.js";
import type { AuthUser } from "../../common/security/auth-user.type.js";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe.js";
import {
  changePasswordSchema,
  updateRoleSchema,
  updateSchema,
  userIdSchema,
  type ChangePasswordInput,
  type UpdateRoleInput,
  type UpdateUserInput,
} from "./user.schema.js";
import { UsersService } from "./users.service.js";

@Controller("users")
@UseGuards(AccessTokenGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  getMe(@CurrentUser() user: AuthUser) {
    return this.usersService.getById(user.id);
  }

  @Patch("me")
  updateMe(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(updateSchema)) body: UpdateUserInput,
  ) {
    return this.usersService.updateById(user.id, body);
  }

  @Delete("me")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMe(@CurrentUser() user: AuthUser): Promise<void> {
    await this.usersService.deleteById(user.id);
  }

  @Patch("me/change-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordInput,
  ): Promise<void> {
    return this.usersService.changePassword(user.id, body);
  }

  @Get()
  @UseGuards(AdminGuard)
  async getAll(@Query() query: Record<string, unknown>) {
    const users = await this.usersService.getFilteredUsers(query);
    return {
      results: users.length,
      data: users,
    };
  }

  @Get(":id")
  @UseGuards(AdminGuard)
  getById(@Param("id", new ZodValidationPipe(userIdSchema)) id: string) {
    return this.usersService.getById(id);
  }

  @Patch(":id")
  @UseGuards(AdminGuard)
  updateById(
    @Param("id", new ZodValidationPipe(userIdSchema)) id: string,
    @Body(new ZodValidationPipe(updateSchema)) body: UpdateUserInput,
  ) {
    return this.usersService.updateById(id, body);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdminGuard)
  deleteById(@Param("id", new ZodValidationPipe(userIdSchema)) id: string): Promise<void> {
    return this.usersService.deleteById(id);
  }

  @Patch(":id/role")
  @UseGuards(AdminGuard)
  updateRole(
    @Param("id", new ZodValidationPipe(userIdSchema)) id: string,
    @Body(new ZodValidationPipe(updateRoleSchema)) body: UpdateRoleInput,
  ) {
    return this.usersService.updateRole(id, body);
  }
}
