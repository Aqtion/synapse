"use client";

import { useParams } from "next/navigation";
import { SandboxVoice } from "@/components/SandboxVoice";

const WORKER_BASE_URL =
  typeof window !== "undefined"
    ? process.env.NEXT_PUBLIC_WORKER_BASE_URL
    : undefined;

export default function SandboxPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const workerBase = WORKER_BASE_URL ?? "";

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
          Set <code className="font-mono text-foreground">NEXT_PUBLIC_WORKER_BASE_URL</code> so the
          sandbox can load.
        </p>
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
