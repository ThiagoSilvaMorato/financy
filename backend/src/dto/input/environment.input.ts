import { Field, InputType } from "type-graphql";

@InputType()
export class CreateEnvironmentInput {
  @Field(() => String)
  name!: string;
}

@InputType()
export class CreateParticipantInput {
  @Field(() => String)
  environmentId!: string;

  @Field(() => String)
  displayName!: string;
}
