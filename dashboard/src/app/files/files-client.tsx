"use client";

import { FormEvent, useState } from "react";
import { listFiles } from "@/lib/workerClient";

export function FilesClient() {
  const [sandboxId, setSandboxId] = useState("");
  const [files, setFiles] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setFiles(null);

    if (!sandboxId.trim()) {
      setError("Enter a sandbox id to list files.");
      return;
    }

    try {
      setLoading(true);
      const response = await listFiles({ sandboxId: sandboxId.trim() });
      setFiles(response.files);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch files from Worker.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-200 md:flex-row md:items-end"
      >
        <label className="flex-1 text-[11px] font-medium text-slate-300">
          Sandbox id
          <input
            value={sandboxId}
            onChange={(event) => setSandboxId(event.target.value)}
            placeholder="e.g. my-sandbox-id"
            className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-sky-500"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center justify-center rounded-md bg-sky-500 px-3 py-1.5 text-[11px] font-semibold text-slate-950 shadow-sm ring-1 ring-sky-400/60 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Loading…" : "List files"}
        </button>
      </form>

      {error && (
        <div className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-100">
          {error}
        </div>
      )}

      {files && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-200">
          {files.length === 0 ? (
            <p className="text-slate-400">No files found in this sandbox.</p>
          ) : (
            <ul className="space-y-1">
              {files.map((file) => (
                <li key={file} className="font-mono text-[11px]">
                  {file}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

