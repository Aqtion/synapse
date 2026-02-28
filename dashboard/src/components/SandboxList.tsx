"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import type { SandboxEntry } from "./SandboxCard";
import { SandboxCard } from "./SandboxCard";

type SandboxListProps = {
  onOpenSandbox: (sandbox: SandboxEntry) => void;
  onInviteMoreTesters?: () => void;
};

export function SandboxList({
  onOpenSandbox,
  onInviteMoreTesters,
}: SandboxListProps) {
  const sandboxes = useQuery(api.sandboxes.listSandboxes);
  const updateLastOpened = useMutation(api.sandboxes.updateLastOpened);
  const removeSandbox = useMutation(api.sandboxes.removeSandbox);

  function handleOpen(sandbox: SandboxEntry) {
    updateLastOpened({ id: sandbox.id });
    onOpenSandbox(sandbox);
  }

  function handleRemove(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    removeSandbox({ id });
  }

  if (sandboxes === undefined) {
    return (
      <div className="text-muted-foreground text-sm py-8">Loading…</div>
    );
  }

  if (sandboxes.length === 0) {
    return null;
  }

  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">
        Recent sandboxes
      </div>
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
            onOpen={handleOpen}
            onRemove={handleRemove}
          />
        ))}
        {onInviteMoreTesters && (
          <Card
            role="button"
            tabIndex={0}
            className="border-dashed cursor-pointer transition-colors hover:border-primary/50 hover:bg-muted/30 flex min-h-[100px]"
            onClick={onInviteMoreTesters}
            onKeyDown={(e) =>
              (e.key === "Enter" || e.key === " ") && onInviteMoreTesters()
            }
          >
            <CardContent className="flex flex-1 items-center justify-center gap-2 text-muted-foreground hover:text-primary">
              <Plus className="size-5" />
              <span className="font-medium">Invite more testers</span>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
