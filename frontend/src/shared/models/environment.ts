export interface EnvironmentMemberModel {
  id: string;
  environmentId: string;
  userId?: string | null;
  role?: "admin" | "user" | "pending" | null;
  displayName?: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
  } | null;
  joinedAt: string;
  removedAt?: string | null;
}

export interface EnvironmentModel {
  id: string;
  name: string;
  isPersonal: boolean;
  members?: EnvironmentMemberModel[] | null;
  pendingMembers?: EnvironmentMemberModel[] | null;
  myMembership?: EnvironmentMemberModel | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnvironmentInviteCodeModel {
  environmentId: string;
  code: string;
  expiresAt: string;
  createdAt: string;
}
