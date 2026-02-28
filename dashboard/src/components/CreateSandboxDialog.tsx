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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2, Github } from "lucide-react";

export type TesterRow = { name: string; email: string };

type ImportRepoArgs = { repoUrl: string; testerName: string; testerEmail: string };

type CreateSandboxDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (testers: TesterRow[]) => void;
  onImportRepo?: (args: ImportRepoArgs) => void;
};

const defaultRow = (): TesterRow => ({ name: "", email: "" });

export function CreateSandboxDialog({
  open,
  onOpenChange,
  onCreate,
  onImportRepo,
}: CreateSandboxDialogProps) {
  const [testers, setTesters] = useState<TesterRow[]>([defaultRow()]);
  const [addCount, setAddCount] = useState(1);
  const [repoUrl, setRepoUrl] = useState("");
  const [importTesterName, setImportTesterName] = useState("");
  const [importTesterEmail, setImportTesterEmail] = useState("");

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

  function handleImport() {
    const url = repoUrl.trim();
    if (!url || !onImportRepo) return;
    onImportRepo({
      repoUrl: url,
      testerName: importTesterName.trim(),
      testerEmail: importTesterEmail.trim().toLowerCase(),
    });
    setRepoUrl("");
    setImportTesterName("");
    setImportTesterEmail("");
  }

  const canSubmit =
    testers.some((r) => r.email.trim().length > 0) &&
    testers.every((r) => !r.email.trim() || r.email.includes("@"));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Sandbox</DialogTitle>
          <DialogDescription>
            Invite testers or import an existing React app from GitHub.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="invite" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="invite">Invite Testers</TabsTrigger>
            <TabsTrigger value="github">
              <Github className="size-3.5 mr-1.5" />
              Import from GitHub
            </TabsTrigger>
          </TabsList>

          <TabsContent value="invite" className="mt-4">
            <div className="space-y-3">
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
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!canSubmit}>Invite</Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="github" className="mt-4">
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Import a public React repo and optionally invite a tester to it.
              </p>
              <Input
                placeholder="https://github.com/owner/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
              />
              <div className="flex items-center gap-2 pt-1">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">invite tester (optional)</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Name"
                  value={importTesterName}
                  onChange={(e) => setImportTesterName(e.target.value)}
                  className="flex-1"
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={importTesterEmail}
                  onChange={(e) => setImportTesterEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleImport()}
                  className="flex-1"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0 mt-6">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                onClick={handleImport}
                disabled={!repoUrl.trim().includes("github.com") || !onImportRepo}
              >
                <Github className="size-4 mr-2" />
                Import
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
