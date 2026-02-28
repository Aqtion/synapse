"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "convex/_generated/api";
import { X, GitPullRequest, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
};

export function SandboxCard({ sandbox, onOpen, onRemove }: SandboxCardProps) {
  const createPR = useAction(api.sandboxes.createPullRequest);
  const [prLoading, setPrLoading] = useState(false);
  const [prResult, setPrResult] = useState<string | null>(
    sandbox.prUrl ?? null,
  );

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

  return (
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
      className="group relative cursor-pointer transition-all hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5"
    >
      <CardContent className="flex items-start justify-between gap-3 pt-5">
        <div className="min-w-0 flex flex-col gap-1">
          <span className="font-semibold text-foreground truncate">
            {sandbox.name}
          </span>
          <span className="font-mono text-xs text-muted-foreground truncate">
            {sandbox.id}
          </span>
          <span className="text-xs text-muted-foreground">
            Opened {timeAgo(sandbox.lastOpenedAt)}
          </span>
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
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary hover:bg-primary/10"
                onClick={handleCreatePR}
                disabled={prLoading}
                aria-label="Create Pull Request"
              >
                {prLoading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <GitPullRequest className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {prResult ? "Update Pull Request" : "Create Pull Request"}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-xs"
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => onRemove(e, sandbox.id)}
                aria-label="Remove from list"
              >
                <X className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove from list</TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
}
