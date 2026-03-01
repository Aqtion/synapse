"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import type { SandboxEntry } from "./SandboxCard";
import { SandboxCard } from "./SandboxCard";
import { SandboxEmptyState } from "./SandboxEmptyState";

type SandboxListProps = {
  userId?: string;
  projectId?: string;
  onOpenSandbox: (sandbox: SandboxEntry) => void;
  onInviteMoreTesters?: () => void;
};

export function SandboxList({
  userId,
  projectId,
  onOpenSandbox,
  onInviteMoreTesters,
}: SandboxListProps) {
  const sandboxes = useQuery(
    api.sandboxes.listSandboxes,
    projectId != null ? { projectId } : {},
  );
  const project = useQuery(
    api.projects.getProject,
    projectId != null ? { projectId } : "skip",
  );
  const updateLastOpened = useMutation(api.sandboxes.updateLastOpened);
  const removeSandbox = useMutation(api.sandboxes.removeSandbox);
  const renameSandboxMutation = useMutation(api.sandboxes.renameSandbox);

  const [renameFor, setRenameFor] = useState<SandboxEntry | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function handleOpen(sandbox: SandboxEntry) {
    updateLastOpened({ id: sandbox.id });
    onOpenSandbox(sandbox);
  }

  function handleRemove(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    removeSandbox({ id });
  }

  function handleRename(sandbox: SandboxEntry) {
    setRenameFor(sandbox);
    setRenameValue(sandbox.name);
  }

  function closeRenameDialog() {
    setRenameFor(null);
    setRenameValue("");
  }

  function submitRename() {
    if (!renameFor) return;
    const name = renameValue.trim();
    if (name) {
      renameSandboxMutation({ id: renameFor.id, name });
      closeRenameDialog();
    }
  }

  if (sandboxes === undefined) {
    return (
      <div className="text-muted-foreground text-sm py-8">Loading…</div>
    );
  }

  if (sandboxes.length === 0 && onInviteMoreTesters) {
    return (
      <SandboxEmptyState onInviteTesters={onInviteMoreTesters} />
    );
  }

  if (sandboxes.length === 0) {
    return null;
  }

  const title = project?.name ? `${project.name}'s sandboxes` : "Sandboxes";

  return (
    <div>
      <h2 className="text-xl font-semibold text-foreground mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sandboxes.map((sb) => (
          <SandboxCard
            key={sb.id}
            sandbox={{
              id: sb.id,
              name: sb.name,
              createdAt: sb.createdAt,
              lastOpenedAt: sb.lastOpenedAt,
              prUrl: sb.prUrl ?? undefined,
              prNumber: sb.prNumber ?? undefined,
              githubRepo: sb.githubRepo ?? undefined,
            }}
            analyticsHref={userId && projectId ? `/${userId}/${projectId}/${sb.id}/analytics` : undefined}
            onOpen={handleOpen}
            onRemove={handleRemove}
            onRename={handleRename}
            onHide={handleRemove}
            onDelete={handleRemove}
          />
        ))}
        {onInviteMoreTesters && (
          <Card
            role="button"
            tabIndex={0}
            className="group border-dashed border-2 cursor-pointer transition-colors hover:border-primary hover:bg-muted/30 flex min-h-[100px]"
            onClick={onInviteMoreTesters}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") && onInviteMoreTesters()
            }
          >
            <CardContent className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary/80 group-hover:text-primary/80 transition-all text-center">
              <Plus className="size-10" />
              <span className="font-medium text-sm">Invite more testers!</span>
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={!!renameFor} onOpenChange={(open) => !open && closeRenameDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename sandbox</DialogTitle>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submitRename()}
            placeholder="Sandbox name"
            aria-label="Sandbox name"
          />
          <DialogFooter>
            <Button variant="outline" onClick={closeRenameDialog}>
              Cancel
            </Button>
            <Button onClick={submitRename} disabled={!renameValue.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
