import { FilesClient } from "./files-client";

export default function FilesPage() {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-base font-semibold text-slate-50 md:text-lg">
          Sandbox files
        </h2>
        <p className="text-xs text-slate-400 md:text-sm">
          Inspect the files written into a sandbox by the Cloudflare Worker.
        </p>
      </header>
      <FilesClient />
    </div>
  );
}

