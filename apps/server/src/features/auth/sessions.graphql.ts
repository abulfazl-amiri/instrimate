import { Field, ID, Int, ObjectType } from "@nestjs/graphql";
import { GraphQLISODateTime } from "@nestjs/graphql";

@ObjectType()
export class DeviceSession {
  @Field(() => ID)
  sessionId!: string;

  @Field({ nullable: true })
  userAgent?: string;

  @Field({ nullable: true })
  ip?: string;

  @Field(() => GraphQLISODateTime, { nullable: true })
  createdAt!: Date | null;

  @Field(() => GraphQLISODateTime, { nullable: true })
  lastRefreshedAt!: Date | null;

  @Field()
  current!: boolean;
}

@ObjectType()
export class LogoutSessionsResult {
  @Field(() => Int)
  sessionsRevoked!: number;

  @Field()
  currentSessionRevoked!: boolean;
}
