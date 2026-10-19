export interface EnvironmentMemberModel {
  id: string;
  environmentId: string;
  userId?: string | null;
  role?: "admin" | "user" | null;
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
  members: EnvironmentMemberModel[];
  createdAt: string;
  updatedAt: string;
}

export interface EnvironmentInviteModel {
  id: string;
  environmentId: string;
  environment: {
    id: string;
    name: string;
  };
  invitedBy: {
    id: string;
    name: string;
    email: string;
  };
  invitedUser?: {
    id: string;
    name: string;
    email: string;
  };
  role: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}
