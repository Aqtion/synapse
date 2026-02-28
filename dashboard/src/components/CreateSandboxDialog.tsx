"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";

export type TesterRow = { name: string; email: string };

type CreateSandboxDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (testers: TesterRow[]) => void;
};

const defaultRow = (): TesterRow => ({ name: "", email: "" });

export function CreateSandboxDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateSandboxDialogProps) {
  const [testers, setTesters] = useState<TesterRow[]>([defaultRow()]);
  const [addCount, setAddCount] = useState(1);

  function addRows() {
    const n = Math.max(1, Math.min(50, addCount));
    setTesters((prev) => [...prev, ...Array.from({ length: n }, defaultRow)]);
  }

  function removeRow(index: number) {
    setTesters((prev) => prev.filter((_, i) => i !== index));
  }

  function updateRow(index: number, field: "name" | "email", value: string) {
    setTesters((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
    );
  }

  function handleCreate() {
    const cleaned = testers
      .map((r) => ({ name: r.name.trim(), email: r.email.trim().toLowerCase() }))
      .filter((r) => r.email.length > 0);
    if (cleaned.length === 0) return;
    onCreate(cleaned);
    setTesters([defaultRow()]);
    setAddCount(1);
  }

  const canSubmit =
    testers.some((r) => r.email.trim().length > 0) &&
    testers.every((r) => !r.email.trim() || r.email.includes("@"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite testers</DialogTitle>
          <DialogDescription>
            Each tester gets their own sandbox. Add name and email for each.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          {testers.map((row, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                placeholder="Name"
                value={row.name}
                onChange={(e) => updateRow(index, "name", e.target.value)}
                className="flex-1 min-w-0"
              />
              <Input
                type="email"
                placeholder="Email"
                value={row.email}
                onChange={(e) => updateRow(index, "email", e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreate())}
                className="flex-1 min-w-0"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeRow(index)}
                disabled={testers.length <= 1}
                aria-label="Remove row"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <button
            type="button"
            onClick={addRows}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-md border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors"
          >
            <Plus className="size-4" />
            <span>Add</span>
            <Input
              type="number"
              min={1}
              max={50}
              value={addCount}
              onChange={(e) => setAddCount(parseInt(e.target.value, 10) || 1)}
              onClick={(e) => e.stopPropagation()}
              className="w-12 h-7 text-center text-sm"
            />
            <span>more testers</span>
          </button>
        </div>
        <DialogFooter className="gap-2 sm:gap-0 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={!canSubmit}>
            Invite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
