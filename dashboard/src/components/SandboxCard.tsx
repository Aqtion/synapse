"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "convex/_generated/api";
import {
  Clock,
  GitPullRequest,
  Loader2,
  ExternalLink,
  MoreVertical,
  Pencil,
  EyeOff,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { timeAgo } from "@/lib/sandbox-utils";

export type SandboxEntry = {
  id: string;
  name: string;
  createdAt: number;
  lastOpenedAt: number;
  prUrl?: string;
  prNumber?: number;
  githubRepo?: string;
};

type SandboxCardProps = {
  sandbox: SandboxEntry;
  onOpen: (sandbox: SandboxEntry) => void;
  onRemove: (e: React.MouseEvent, id: string) => void;
  onRename?: (sandbox: SandboxEntry) => void;
  onHide?: (e: React.MouseEvent, id: string) => void;
  onDelete?: (e: React.MouseEvent, id: string) => void;
};

function SandboxCardMenuContent({
  sandbox,
  onOpen,
  onRename,
  onHide,
  onDelete,
  onClose,
}: {
  sandbox: SandboxEntry;
  onOpen: (sandbox: SandboxEntry) => void;
  onRename?: (sandbox: SandboxEntry) => void;
  onHide?: (e: React.MouseEvent, id: string) => void;
  onDelete?: (e: React.MouseEvent, id: string) => void;
  onClose?: () => void;
}) {
  const openInNewTab = () => {
    if (typeof window !== "undefined") {
      window.open(`${window.location.origin}/s/${sandbox.id}`, "_blank");
    }
    onClose?.();
  };

  return (
    <>
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault();
          openInNewTab();
        }}
      >
        <ExternalLink className="size-4" />
        Open sandbox
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault();
          onRename?.(sandbox);
          onClose?.();
        }}
      >
        <Pencil className="size-4" />
        Rename sandbox
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        variant="destructive"
        className="text-destructive focus:text-destructive"
        onSelect={(e) => {
          e.preventDefault();
          onHide?.({ stopPropagation: () => {} } as React.MouseEvent, sandbox.id);
          onClose?.();
        }}
      >
        <EyeOff className="size-4" />
        Hide sandbox
      </DropdownMenuItem>
      <DropdownMenuItem
        variant="destructive"
        onSelect={(e) => {
          e.preventDefault();
          onDelete?.({ stopPropagation: () => {} } as React.MouseEvent, sandbox.id);
          onClose?.();
        }}
      >
        <Trash2 className="size-4" />
        Delete sandbox
      </DropdownMenuItem>
    </>
  );
}

export function SandboxCard({
  sandbox,
  onOpen,
  onRemove,
  onRename,
  onHide,
  onDelete,
}: SandboxCardProps) {
  const createPR = useAction(api.sandboxes.createPullRequest);
  const [prLoading, setPrLoading] = useState(false);
  const [prResult, setPrResult] = useState<string | null>(
    sandbox.prUrl ?? null,
  );
  const [menuOpen, setMenuOpen] = useState(false);

  const handleHide = onHide ?? onRemove;
  const handleDelete = onDelete ?? onRemove;

  async function handleCreatePR(e: React.MouseEvent) {
    e.stopPropagation();
    setPrLoading(true);
    try {
      const result = await createPR({ sandboxId: sandbox.id });
      setPrResult(result.prUrl);
    } catch (err) {
      console.error("Create PR failed:", err);
    } finally {
      setPrLoading(false);
    }
  }

  const menuContent = (
    <SandboxCardMenuContent
      sandbox={sandbox}
      onOpen={onOpen}
      onRename={onRename}
      onHide={handleHide}
      onDelete={handleDelete}
      onClose={() => setMenuOpen(false)}
    />
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => onOpen(sandbox)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpen(sandbox);
            }
          }}
          className="group relative cursor-pointer overflow-hidden transition-all bg-card border-2 hover:border-primary/50 hover:shadow-lg flex flex-col p-0"
        >
          {/* Image / preview area at top */}
          <div
            className="w-full aspect-video bg-muted shrink-0 bg-linear-to-br from-muted to-muted/70"
            aria-hidden
          />

          <CardContent className="flex flex-row justify-between gap-2 pt-2 pb-4 px-4 min-w-0">
            {/* Title top-left under image */}
            <div className="flex flex-col items-start justify-between gap-2 min-w-0">
              <span className="font-semibold text-lg text-foreground truncate flex-1 min-w-0">
                {sandbox.name}
              </span>
              {/* Last opened: clock + "3m ago" */}

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5 shrink-0" />
                <span>{timeAgo(sandbox.lastOpenedAt)}</span>
              </div>
            </div>

            {/* PR link if exists */}
            {prResult && (
              <a
                href={prResult}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="size-3" />
                PR #{sandbox.prNumber ?? ""}
              </a>
            )}

            {/* Actions: Make PR (bigger icon) right-aligned, then three dots */}
            <div className="flex items-center justify-end gap-1 mt-auto pt-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 text-muted-foreground hover:text-foreground hover:bg-primary/10"
                    onClick={handleCreatePR}
                    disabled={prLoading}
                    aria-label={prResult ? "Update Pull Request" : "Create Pull Request"}
                  >
                    {prLoading ? (
                      <Loader2 className="size-5 animate-spin" />
                    ) : (
                      <GitPullRequest className="size-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {prResult ? "Update Pull Request" : "Create Pull Request"}
                </TooltipContent>
              </Tooltip>
              <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 text-muted-foreground hover:text-foreground hover:bg-accent"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Sandbox options"
                  >
                    <MoreVertical className="size-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <SandboxCardMenuContent
                    sandbox={sandbox}
                    onOpen={onOpen}
                    onRename={onRename}
                    onHide={handleHide}
                    onDelete={handleDelete}
                    onClose={() => setMenuOpen(false)}
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48" onClick={(e) => e.stopPropagation()}>
        <ContextMenuItem
          onSelect={() => {
            if (typeof window !== "undefined") {
              window.open(`${window.location.origin}/s/${sandbox.id}`, "_blank");
            }
          }}
        >
          <ExternalLink className="size-4" />
          Open sandbox
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => onRename?.(sandbox)}>
          <Pencil className="size-4" />
          Rename sandbox
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          className="text-destructive focus:text-destructive"
          onSelect={() => handleHide({ stopPropagation: () => {} } as React.MouseEvent, sandbox.id)}
        >
          <EyeOff className="size-4" />
          Hide sandbox
        </ContextMenuItem>
        <ContextMenuItem
          variant="destructive"
          onSelect={() => handleDelete({ stopPropagation: () => {} } as React.MouseEvent, sandbox.id)}
        >
          <Trash2 className="size-4" />
          Delete sandbox
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
