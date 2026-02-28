"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useUser } from "@/contexts/UserContext";

const SIGNIN_PATH = "/signin";

/**
 * Wraps content that requires authentication.
 * Redirects to /signin if not logged in; shows loading while session is pending.
 */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isPending } = useUser();

  useEffect(() => {
    if (isPending) return;
    if (!user) {
      const signInUrl = `${SIGNIN_PATH}?callbackUrl=${encodeURIComponent(pathname ?? "/")}`;
      router.replace(signInUrl);
    }
  }, [user, isPending, router, pathname]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
