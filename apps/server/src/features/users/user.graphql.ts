import { Field, ID, InputType, Int, ObjectType, registerEnumType } from "@nestjs/graphql";
import { GraphQLISODateTime } from "@nestjs/graphql";

enum UserRole {
  ADMIN = "ADMIN",
  TEACHER = "TEACHER",
}

enum AccountStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  DELETED = "DELETED",
}

registerEnumType(UserRole, { name: "UserRole" });
registerEnumType(AccountStatus, { name: "AccountStatus" });

@ObjectType()
export class User {
  @Field(() => ID)
  id!: string;

  @Field()
  name!: string;

  @Field()
  email!: string;

  @Field(() => UserRole)
  role!: string;

  @Field(() => AccountStatus)
  status!: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  emailVerifiedAt!: Date | null;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}

@ObjectType()
export class UsersResult {
  @Field(() => Int)
  results!: number;

  @Field(() => [User])
  data!: User[];

  @Field(() => Int)
  totalCount!: number;

  @Field(() => Int)
  page!: number;

  @Field(() => Int)
  limit!: number;

  @Field(() => Int)
  totalPages!: number;

  @Field()
  hasNextPage!: boolean;

  @Field()
  hasPreviousPage!: boolean;
}

@InputType()
export class UserFilterInput {
  @Field({ nullable: true })
  name?: string;

  @Field({ nullable: true })
  email?: string;

  @Field(() => UserRole, { nullable: true })
  role?: UserRole;

  @Field(() => Int, { nullable: true })
  limit?: number;

  @Field(() => Int, { nullable: true })
  page?: number;

  @Field({ nullable: true })
  sort?: string;
}

@InputType()
export class UpdateUserInput {
  @Field({ nullable: true })
  email?: string;

  @Field({ nullable: true })
  name?: string;
}

@InputType()
export class ChangePasswordInput {
  @Field()
  oldPassword!: string;

  @Field()
  newPassword!: string;
}

@InputType()
export class UpdateRoleInput {
  @Field(() => UserRole)
  role!: UserRole;
}
