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
  Req,
  UseGuards,
} from "@nestjs/common";

import {
  AccessTokenGuard,
  AdminGuard,
  type AuthenticatedRequest,
} from "../../common/security/auth.guards.js";
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

@Controller("api/v1/users")
@UseGuards(AccessTokenGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get("me")
  getMe(@Req() request: AuthenticatedRequest) {
    return this.usersService.getById(request.user!.id);
  }

  @Patch("me")
  updateMe(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(updateSchema)) body: UpdateUserInput,
  ) {
    return this.usersService.updateById(request.user!.id, body);
  }

  @Delete("me")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMe(@Req() request: AuthenticatedRequest): Promise<void> {
    await this.usersService.deleteById(request.user!.id);
  }

  @Patch("me/change-password")
  @HttpCode(HttpStatus.NO_CONTENT)
  changePassword(
    @Req() request: AuthenticatedRequest,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: ChangePasswordInput,
  ): Promise<void> {
    return this.usersService.changePassword(request.user!.id, body);
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
