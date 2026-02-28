"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreateSandboxDialog } from "./CreateSandboxDialog";
import { SandboxEmptyState } from "./SandboxEmptyState";
import { SandboxHero } from "./SandboxHero";
import { SandboxList } from "./SandboxList";
import type { SandboxEntry } from "./SandboxCard";

export function SandboxDashboard() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const sandboxes = useQuery(api.sandboxes.listSandboxes);
  const createSandboxMutation = useMutation(api.sandboxes.createSandbox);
  const ensureSandboxOnWorker = useAction(api.sandboxes.ensureSandboxOnWorker);

  const workerBase =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_WORKER_BASE_URL ?? ""
      : "";
  const hasWorkerUrl = !!workerBase;

  async function handleCreate(name: string) {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const id = await createSandboxMutation({ name: name.trim() });
      await ensureSandboxOnWorker({ sandboxId: id });
      setModalOpen(false);
      router.push(`/s/${id}`);
    } catch (err) {
      console.error("Create sandbox failed:", err);
      setCreating(false);
    }
  }

  function handleOpenSandbox(sandbox: SandboxEntry) {
    router.push(`/s/${sandbox.id}`);
  }

  const showEmpty = sandboxes !== undefined && sandboxes.length === 0;

  return (
    <>
      <div className="mx-auto max-w-[860px] px-6 py-12">
        <SandboxHero onNewSandbox={() => setModalOpen(true)} />

        {showEmpty ? (
          <SandboxEmptyState />
        ) : (
          <SandboxList onOpenSandbox={handleOpenSandbox} />
        )}

        {!hasWorkerUrl && (
          <Alert variant="destructive" className="mt-8">
            <AlertDescription>
              Set{" "}
              <code className="font-mono text-destructive-foreground">
                NEXT_PUBLIC_WORKER_BASE_URL
              </code>{" "}
              so &quot;New Sandbox&quot; opens the studio on your Worker.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <CreateSandboxDialog
        open={modalOpen}
        onOpenChange={(open) => !creating && setModalOpen(open)}
        onCreate={handleCreate}
      />
    </>
  );
}
