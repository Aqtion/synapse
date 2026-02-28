"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAction, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
// import { SignInDialog } from "@/components/SignInDialog";
import { SandboxVoice } from "@/components/SandboxVoice";
import { Loader2 } from "lucide-react";

const WORKER_BASE_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_WORKER_BASE_URL
    : undefined;

export default function SandboxPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const workerBase = WORKER_BASE_URL ?? "";

  // const identity = useQuery(api.auth.getCurrentUser);
  const sandbox = useQuery(
    api.sandboxes.getSandboxForCurrentUser,
    id ? { sandboxId: id } : "skip",
  );
  const ensureSandboxOnWorker = useAction(api.sandboxes.ensureSandboxOnWorker);

  const [workerReady, setWorkerReady] = useState(false);
  const [workerError, setWorkerError] = useState<string | null>(null);

  // Start worker only after we know the user is the assigned tester
  useEffect(() => {
    if (!id || !sandbox || workerReady || workerError) return;
    let cancelled = false;
    ensureSandboxOnWorker({ sandboxId: id })
      .then(() => {
        if (!cancelled) setWorkerReady(true);
      })
      .catch((err) => {
        if (!cancelled)
          setWorkerError(err instanceof Error ? err.message : "Failed to start sandbox");
      });
    return () => {
      cancelled = true;
    };
  }, [id, sandbox, ensureSandboxOnWorker, workerReady, workerError]);

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Invalid sandbox.
      </div>
    );
  }

  if (!workerBase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground p-6">
        <p>
          Set{" "}
          <code className="font-mono text-foreground">
            NEXT_PUBLIC_WORKER_BASE_URL
          </code>{" "}
          so the sandbox can load.
        </p>
      </div>
    );
  }

  // Session + sign-in gate temporarily disabled to allow sandboxes without auth
  // // Session still loading
  // if (identity === undefined) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
  //       <Loader2 className="size-8 animate-spin" aria-label="Loading" />
  //     </div>
  //   );
  // }
  //
  // // Not signed in: block sandbox and show sign-in
  // if (identity === null) {
  //   return (
  //     <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
  //       <p className="text-muted-foreground text-center mb-4">
  //         Sign in to access this sandbox.
  //       </p>
  //       <SignInDialog
  //         open={true}
  //         onOpenChange={() => {}}
  //         callbackURL={`/s/${id}`}
  //       />
  //     </div>
  //   );
  // }

  // Signed in; check if this user is the assigned tester
  if (sandbox === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="size-8 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (sandbox === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground p-6">
        <p className="text-center">Access denied. This sandbox is not assigned to you.</p>
      </div>
    );
  }

  if (workerError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground p-6">
        <p className="text-center text-destructive">{workerError}</p>
      </div>
    );
  }

  if (!workerReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="size-8 animate-spin" aria-label="Starting sandbox" />
      </div>
    );
  }

  const iframeSrc = `${workerBase.replace(/\/$/, "")}/s/${id}/`;

  return (
    <>
      <iframe
        src={iframeSrc}
        className="w-full h-screen border-0"
        title={`Sandbox ${id}`}
      />
      <SandboxVoice sandboxId={id} />
    </>
  );
}
