"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SignInDialog } from "@/components/SignInDialog";
import { useUser } from "@/contexts/UserContext";

const Page = () => {
  const [open, setOpen] = useState(true);
  const router = useRouter();
  const { user, isPending } = useUser();

  useEffect(() => {
    if (isPending) return;
    if (user) {
      router.replace("/");
    }
  }, [user, isPending, router]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return <SignInDialog open={open} onOpenChange={setOpen} />;
};

export default Page;