"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "convex/_generated/api";
import { Loader2 } from "lucide-react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useUser } from "@/contexts/UserContext";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const router = useRouter();
  const user_id = params?.user_id as string | undefined;
  const { user, isLoading } = useUser();
  const upsertUserEmail = useMutation(api.userEmails.upsertUserEmail);

  useEffect(() => {
    if (user?.subject && user?.email) {
      upsertUserEmail({ userId: user.subject, email: user.email }).catch(() => {});
    }
  }, [user?.subject, user?.email, upsertUserEmail]);

  useEffect(() => {
    if (isLoading || !user_id) return;
    if (user === null) {
      router.replace("/");
      return;
    }
    if (user.subject && user_id !== user.subject) {
      router.replace(`/${user.subject}`);
    }
  }, [user, isLoading, user_id, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  if (user === null) {
    return null;
  }

  if (user.subject && user_id !== user.subject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" aria-label="Redirecting" />
      </div>
    );
  }

  if (!user_id) return null;

  return (
    <SidebarProvider>
      <AppSidebar userId={user_id} />
      <SidebarInset>
        <DashboardHeader />
        <div className="flex flex-1 flex-col min-h-screen">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
