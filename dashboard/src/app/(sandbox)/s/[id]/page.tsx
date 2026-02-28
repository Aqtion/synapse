"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useAction, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { SandboxVoice } from "@/components/SandboxVoice";
import { useSandboxPostHogOnLoad } from "@/components/SandboxPostHogTelemetry";
import { Loader2 } from "lucide-react";

const WORKER_BASE_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_WORKER_BASE_URL
    : undefined;

export default function SandboxPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const workerBase = WORKER_BASE_URL ?? "";
  const onSandboxFrameLoad = useSandboxPostHogOnLoad(id ?? "");

  const sandbox = useQuery(
    api.sandboxes.getSandboxForCurrentUser,
    id ? { sandboxId: id } : "skip",
  );
  const ensureSandboxOnWorker = useAction(api.sandboxes.ensureSandboxOnWorker);

  const [workerReady, setWorkerReady] = useState(false);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const [phDebug, setPhDebug] = useState<
    "idle" | "no_key" | "script_loaded" | "inited"
  >("idle");

  useEffect(() => {
    if (typeof window === "undefined" || !id) return;
    const key = (process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "").trim();
    if (!key) {
      setPhDebug("no_key");
      return;
    }
    const onMessage = (ev: MessageEvent) => {
      if (ev.data?.type === "SANDBOX_POSTHOG_SCRIPT_LOADED")
        setPhDebug("script_loaded");
      if (ev.data?.type === "POSTHOG_IFRAME_INITED") setPhDebug("inited");
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [id]);

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

  const iframeSrc = `${workerBase.replace(/\/$/, "")}/s/${id}/?_ph=1`;

  return (
    <>
      <iframe
        id="sandboxFrame"
        src={iframeSrc}
        className="w-full h-screen border-0"
        title={`Sandbox ${id}`}
        onLoad={onSandboxFrameLoad}
      />
      <SandboxVoice sandboxId={id} />
      {process.env.NODE_ENV === "development" && (
        <div
          className="fixed bottom-2 left-2 z-50 rounded border bg-background/95 px-2 py-1 text-xs text-muted-foreground shadow"
          aria-live="polite"
        >
          PostHog: {phDebug}
          {phDebug === "no_key" && " (set NEXT_PUBLIC_POSTHOG_KEY)"}
        </div>
      )}
    </>
  );
}
