"use client";

import { X } from "lucide-react";
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
};

type SandboxCardProps = {
  sandbox: SandboxEntry;
  onOpen: (sandbox: SandboxEntry) => void;
  onRemove: (e: React.MouseEvent, id: string) => void;
};

export function SandboxCard({ sandbox, onOpen, onRemove }: SandboxCardProps) {
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
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-xs"
              className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={(e) => onRemove(e, sandbox.id)}
              aria-label="Remove from list"
            >
              <X className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Remove from list</TooltipContent>
        </Tooltip>
      </CardContent>
    </Card>
  );
}
