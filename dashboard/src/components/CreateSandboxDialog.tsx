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

type CreateSandboxDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => void;
};

export function CreateSandboxDialog({
  open,
  onOpenChange,
  onCreate,
}: CreateSandboxDialogProps) {
  const [nameInput, setNameInput] = useState("");

  function handleCreate() {
    const name = nameInput.trim() || "Untitled";
    onCreate(name);
    setNameInput("");
    // Parent closes dialog and redirects after async create
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Sandbox</DialogTitle>
          <DialogDescription>
            Give it a name. An ID will be generated automatically.
          </DialogDescription>
        </DialogHeader>
        <Input
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder="My awesome project"
          className="mt-2"
          autoFocus
        />
        <DialogFooter className="gap-2 sm:gap-0 mt-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
