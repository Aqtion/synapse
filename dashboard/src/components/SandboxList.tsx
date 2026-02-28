"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import type { SandboxEntry } from "./SandboxCard";
import { SandboxCard } from "./SandboxCard";

type SandboxListProps = {
  onOpenSandbox: (sandbox: SandboxEntry) => void;
};

export function SandboxList({ onOpenSandbox }: SandboxListProps) {
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
            }}
            onOpen={handleOpen}
            onRemove={handleRemove}
          />
        ))}
      </div>
    </div>
  );
}
