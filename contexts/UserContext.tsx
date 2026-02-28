"use client";

import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from "react";
import { authClient } from "@/lib/auth-client";

type SessionUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  emailVerified: boolean;
  [key: string]: unknown;
};

type UserContextValue = {
  /** Current session user, or null if not authenticated */
  user: SessionUser | null;
  /** Session data (includes user and session metadata) */
  session: { user: SessionUser; session?: { expiresAt?: Date; token?: string } } | null;
  /** True while the initial session check is in progress */
  isPending: boolean;
  /** True if the user is authenticated */
  isAuthenticated: boolean;
  /** Re-fetch the session (e.g. after login) */
  refetch: () => Promise<void>;
};

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const { data: sessionData, isPending, refetch: refetchSession } = authClient.useSession();

  const user = (sessionData && typeof sessionData === "object" && "user" in sessionData
    ? (sessionData as { user: SessionUser }).user
    : null) as SessionUser | null;
  const session = (sessionData && typeof sessionData === "object" && "user" in sessionData
    ? sessionData
    : null) as UserContextValue["session"];
  const isAuthenticated = !!user;

  const refetch = useCallback(async () => {
    await refetchSession();
  }, [refetchSession]);

  const value: UserContextValue = {
    user,
    session,
    isPending,
    isAuthenticated,
    refetch,
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return ctx;
}

export function useOptionalUser(): UserContextValue | null {
  return useContext(UserContext);
}
