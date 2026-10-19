import type { EnvironmentMemberModel, EnvironmentModel } from "@/shared/models/environment";

export function getMyEnvironmentMember(
  environment: EnvironmentModel | undefined,
  userId: string | undefined
): EnvironmentMemberModel | undefined {
  if (!environment || !userId) return undefined;

  return environment.members.find((member) => member.user?.id === userId);
}
