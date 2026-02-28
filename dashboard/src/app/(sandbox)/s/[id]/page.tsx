"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useAction, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { SandboxVoice } from "@/components/SandboxVoice";
import { Loader2 } from "lucide-react";

const WORKER_BASE_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_WORKER_BASE_URL
    : undefined;
const SANDBOX_FRAME_ID = "sandboxFrame";

function sendPostHogStop() {
  try {
    const frame = document.getElementById(SANDBOX_FRAME_ID) as HTMLIFrameElement | null;
    if (frame?.contentWindow) frame.contentWindow.postMessage({ type: "POSTHOG_STOP" }, "*");
  } catch {
    // ignore
  }
}

export default function SandboxPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const workerBase = WORKER_BASE_URL ?? "";

  const sandbox = useQuery(
    api.sandboxes.getSandboxForCurrentUser,
    id ? { sandboxId: id } : "skip",
  );
  const ensureSandboxOnWorker = useAction(api.sandboxes.ensureSandboxOnWorker);

  const [workerReady, setWorkerReady] = useState(false);
  const [workerError, setWorkerError] = useState<string | null>(null);

  const cachedSandboxRef = useRef<{ id: string; value: unknown } | null>(null);
  if (sandbox !== undefined && id) {
    cachedSandboxRef.current = { id, value: sandbox };
  }
  const resolvedSandbox =
    sandbox !== undefined
      ? sandbox
      : id && cachedSandboxRef.current?.id === id
        ? cachedSandboxRef.current.value
        : undefined;

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

  if (resolvedSandbox === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="size-8 animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (resolvedSandbox === null) {
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
        id="sandboxFrame"
        src={iframeSrc}
        className="w-full h-screen border-0"
        title={`Sandbox ${id}`}
      />
      <SandboxVoice sandboxId={id} />
    </>
  );
}
