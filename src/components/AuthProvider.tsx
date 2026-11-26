"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { ApiError } from "@/lib/apiClient";
import { getMe, logout as logoutRequest } from "@/lib/userApi";
import { SessionUser } from "@/types/user";

interface AuthState {
  user: SessionUser | null;
  isLoading: boolean;
  refresh: () => Promise<SessionUser | null>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await getMe();
      setUser(me);
      return me;
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) {
        console.error("Failed to load current user", error);
      }
      setUser(null);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isActive = true;
    getMe()
      .then((me) => isActive && setUser(me))
      .catch(() => isActive && setUser(null))
      .finally(() => isActive && setIsLoading(false));
    return () => {
      isActive = false;
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
    }
  }, []);

  const can = useCallback(
    (permission: string) => !!user?.permissions.includes(permission),
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, isLoading, refresh, logout, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

export function useRequireAuth(permission?: string): SessionUser | null {
  const { user, isLoading, can } = useAuth();
  const router = useRouter();
  const allowed = !!user && (!permission || can(permission));

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace("/login");
    else if (permission && !can(permission)) router.replace("/tickets");
  }, [isLoading, user, permission, can, router]);

  return allowed ? user : null;
}
