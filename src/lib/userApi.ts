import { apiFetch, deleteJson, patchJson, postJson } from "@/lib/apiClient";
import { Permission, Role, RoleInput } from "@/types/role";
import {
  CreateUserInput,
  SessionUser,
  UpdateUserInput,
  User,
} from "@/types/user";

export const listUsers = () => apiFetch<User[]>("/api/users");

export interface UserOption {
  id: number;
  name: string;
  roleName: string;
}

export const listAssignees = () => apiFetch<UserOption[]>("/api/users/agents");

export const listManagers = () => apiFetch<UserOption[]>("/api/users/managers");

export const listRoles = () => apiFetch<Role[]>("/api/roles");

export const listPermissions = () => apiFetch<Permission[]>("/api/permissions");

export const createRole = (input: RoleInput) => postJson<Role>("/api/roles", input);

export const updateRole = (id: number, input: RoleInput) =>
  patchJson<Role>(`/api/roles/${id}`, input);

export const deleteRole = (id: number) => deleteJson<{ ok: true }>(`/api/roles/${id}`);

export const createUser = (input: CreateUserInput) =>
  postJson<User>("/api/users", input);

export const updateUser = (id: number, input: UpdateUserInput) =>
  patchJson<User>(`/api/users/${id}`, input);

export const deleteUser = (id: number) => deleteJson<{ ok: true }>(`/api/users/${id}`);

export const getMe = () => apiFetch<SessionUser>("/api/auth/me");

export const createFirstAdmin = (input: Omit<CreateUserInput, "roleId">) =>
  postJson<{ ok: true }>("/api/setup", input);
