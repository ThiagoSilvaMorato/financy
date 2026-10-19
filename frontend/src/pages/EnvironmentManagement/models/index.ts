export interface InviteMemberForm {
  email: string;
  role: "admin" | "user";
}

export interface CreateParticipantForm {
  displayName: string;
}

export interface RenameEnvironmentForm {
  name: string;
}
