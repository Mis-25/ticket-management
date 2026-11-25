export interface Role {
  id: number;
  name: string;
  description: string;
  isSystem: boolean;
  permissions: string[];
  userCount: number;
}

export interface Permission {
  code: string;
  description: string;
  recommendedFor: string[];
}

export function guessSuggestionType(roleName: string, types: string[]): string {
  const name = roleName.trim().toLowerCase();
  if (name === "") return "";
  const exact = types.find((t) => t.toLowerCase() === name);
  if (exact) return exact;
  return (
    types.find((t) =>
      t.toLowerCase().split(" ").some((word) => word.length > 3 && name.includes(word))
    ) ?? ""
  );
}

export interface RoleInput {
  name?: string;
  description?: string;
  permissions?: string[];
}

export const ROLE_LIMITS = { name: 50, description: 255 } as const;

export type RoleErrors = Partial<Record<"name" | "description" | "permissions", string>>;

export function validateRole(input: RoleInput): RoleErrors {
  const errors: RoleErrors = {};
  if (input.name !== undefined) {
    const name = input.name.trim();
    if (name === "") errors.name = "Role name is required.";
    else if (name.length > ROLE_LIMITS.name)
      errors.name = `Role name must be at most ${ROLE_LIMITS.name} characters.`;
  }
  if (input.description !== undefined && input.description.trim().length > ROLE_LIMITS.description)
    errors.description = `Description must be at most ${ROLE_LIMITS.description} characters.`;
  if (input.permissions !== undefined && input.permissions.length === 0)
    errors.permissions = "Please select at least one permission.";
  return errors;
}

export const PERMISSION_GROUPS: { title: string; codes: string[] }[] = [
  {
    title: "Ticket assignment",
    codes: ["ticket.assign", "ticket.view_assigned"],
  },
  {
    title: "Tickets",
    codes: [
      "ticket.create",
      "ticket.view_all",
      "ticket.view_own",
      "ticket.start",
      "ticket.hold",
      "ticket.resolve",
      "ticket.close_confirm",
      "ticket.close_any",
      "ticket.reopen",
      "ticket.delete",
    ],
  },
  {
    title: "Replies & files",
    codes: ["comment.public", "comment.internal", "attachment.upload", "history.view"],
  },
  {
    title: "Admin pages",
    codes: ["user.manage", "process.manage"],
  },
];
