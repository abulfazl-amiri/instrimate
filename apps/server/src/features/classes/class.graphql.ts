import {
  Field,
  GraphQLISODateTime,
  ID,
  InputType,
  Int,
  ObjectType,
  registerEnumType,
} from "@nestjs/graphql";

export enum ClassStatus {
  ACTIVE = "ACTIVE",
  ARCHIVED = "ARCHIVED",
}

registerEnumType(ClassStatus, { name: "ClassStatus" });

@ObjectType()
export class Class {
  @Field(() => ID)
  id!: string;

  @Field(() => ID)
  teacherId!: string;

  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  description!: string | null;

  @Field(() => ClassStatus)
  status!: string;

  @Field(() => GraphQLISODateTime)
  createdAt!: Date;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}

@ObjectType()
export class ClassesResult {
  @Field(() => Int)
  results!: number;

  @Field(() => [Class])
  data!: Class[];

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
export class ClassFilterInput {
  @Field(() => ClassStatus, { nullable: true })
  status?: ClassStatus;

  @Field(() => Int, { nullable: true })
  limit?: number;

  @Field(() => Int, { nullable: true })
  page?: number;

  @Field({ nullable: true })
  sort?: string;
}

@InputType()
export class CreateClassInput {
  @Field()
  name!: string;

  @Field(() => String, { nullable: true })
  description?: string | null;
}

@InputType()
export class UpdateClassInput {
  @Field({ nullable: true })
  name?: string;

  @Field(() => String, { nullable: true })
  description?: string | null;

  @Field(() => ClassStatus, { nullable: true })
  status?: ClassStatus;
}
