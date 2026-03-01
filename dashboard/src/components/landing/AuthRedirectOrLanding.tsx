"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUserOptional } from "@/contexts/UserContext";
import { LandingPage } from "@/components/landing/LandingPage";
import { Loader2 } from "lucide-react";

/**
 * Renders landing page when unauthenticated; redirects to /[user_id] when authenticated.
 * Used at "/" (root).
 */
export function AuthRedirectOrLanding() {
  const router = useRouter();
  const { user, isLoading } = useUserOptional();

  useEffect(() => {
    if (isLoading) return;
    if (user?.subject) {
      router.replace(`/${user.subject}`);
    }
  }, [user?.subject, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  if (user?.subject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-label="Redirecting" />
      </div>
    );
  }

  return <LandingPage />;
}
