import { apiFetch, patchJson, postJson } from "@/lib/apiClient";
import {
  CreateUserInput,
  SessionUser,
  UpdateUserInput,
  User,
} from "@/types/user";

export const listUsers = () => apiFetch<User[]>("/api/users");

export const listSupportAgents = () =>
  apiFetch<{ id: number; name: string }[]>("/api/users/agents");

export const createUser = (input: CreateUserInput) =>
  postJson<User>("/api/users", input);

export const updateUser = (id: number, input: UpdateUserInput) =>
  patchJson<User>(`/api/users/${id}`, input);

// ---------- Current user (hamesha Admin — koi user-select nahi) ----------
export const getMe = () => apiFetch<SessionUser>("/api/auth/me");

export const createFirstAdmin = (input: Omit<CreateUserInput, "roleId">) =>
  postJson<{ ok: true }>("/api/setup", input);
