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
import { getMe } from "@/lib/userApi";
import { SessionUser } from "@/types/user";

interface AuthState {
  user: SessionUser | null;
  isLoading: boolean;
  refresh: () => Promise<SessionUser | null>;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

/** Poori app ko current user (Admin) ki jaankari deta hai — server se. */
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

  const can = useCallback(
    (permission: string) => !!user?.permissions.includes(permission),
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, isLoading, refresh, can }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}

/**
 * Page ke liye: koi Admin nahi bana to /setup par bhejo (sirf pehli baar).
 * permission diya ho aur user ke paas na ho to /tickets par bhejo.
 * Asli security backend API karti hai; ye sirf UI redirect hai.
 */
export function useRequireAuth(permission?: string): SessionUser | null {
  const { user, isLoading, can } = useAuth();
  const router = useRouter();
  const allowed = !!user && (!permission || can(permission));

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace("/setup");
    else if (permission && !can(permission)) router.replace("/tickets");
  }, [isLoading, user, permission, can, router]);

  return allowed ? user : null;
}
