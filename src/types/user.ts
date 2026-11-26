export const ROLES = {
  ADMIN: 1,
} as const;

export type RoleId = number;

export function isRoleId(value: unknown): value is RoleId {
  return typeof value === "number" && Number.isInteger(value) && value > 0 && value < 32768;
}

export type UserStatus = "active" | "inactive";

export interface User {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  roleId: RoleId;
  roleName: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  replyCount: number;
}

export interface SessionUser {
  id: number;
  name: string;
  email: string;
  roleId: RoleId;
  roleName: string;
  permissions: string[];
}

export interface CreateUserInput {
  name: string;
  email: string;
  phoneNumber: string;
  roleId: RoleId;
  password: string;
}

export interface UpdateUserInput {
  name?: string;
  phoneNumber?: string;
  roleId?: RoleId;
  status?: UserStatus;
  password?: string;
}

export const USER_LIMITS = {
  name: 100,
  email: 255,
  phoneNumber: 20,
  passwordMin: 6,
  passwordMax: 100,
} as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9\s-]{10,20}$/;

export type UserErrors = Partial<
  Record<"name" | "email" | "phoneNumber" | "roleId" | "password", string>
>;

function checkName(name: string, errors: UserErrors) {
  if (name.trim() === "") errors.name = "Name is required.";
  else if (name.trim().length > USER_LIMITS.name)
    errors.name = `Name must be at most ${USER_LIMITS.name} characters.`;
}

function checkPhone(phone: string, errors: UserErrors) {
  const value = phone.trim();
  if (value === "") errors.phoneNumber = "Phone number is required.";
  else if (!PHONE_PATTERN.test(value) || value.replace(/\D/g, "").length < 10)
    errors.phoneNumber = "Please enter a valid phone number (min 10 digits).";
}

function checkPassword(password: string, errors: UserErrors) {
  if (password === "") errors.password = "Password is required.";
  else if (password.length < USER_LIMITS.passwordMin)
    errors.password = `Password must be at least ${USER_LIMITS.passwordMin} characters.`;
  else if (password.length > USER_LIMITS.passwordMax)
    errors.password = `Password must be at most ${USER_LIMITS.passwordMax} characters.`;
}

export function validateUser(input: CreateUserInput): UserErrors {
  const errors: UserErrors = {};
  checkName(input.name, errors);

  const email = input.email.trim();
  if (email === "") errors.email = "Email is required.";
  else if (email.length > USER_LIMITS.email || !EMAIL_PATTERN.test(email))
    errors.email = "Please enter a valid email.";

  checkPhone(input.phoneNumber, errors);

  if (!isRoleId(input.roleId)) errors.roleId = "Please select a role.";
  checkPassword(input.password, errors);
  return errors;
}

export function validateUserUpdate(input: UpdateUserInput): UserErrors {
  const errors: UserErrors = {};
  if (input.name !== undefined) checkName(input.name, errors);
  if (input.phoneNumber !== undefined) checkPhone(input.phoneNumber, errors);
  if (input.roleId !== undefined && !isRoleId(input.roleId))
    errors.roleId = "Please select a role.";
  if (input.password) checkPassword(input.password, errors);
  return errors;
}

