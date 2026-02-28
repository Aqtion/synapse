import { RunsClient } from "./runs-client";

export default function RunsPage() {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h2 className="text-base font-semibold text-slate-50 md:text-lg">
          Run history
        </h2>
        <p className="text-xs text-slate-400 md:text-sm">
          Recent sandbox runs logged via Convex. This list updates automatically
          when new runs are recorded.
        </p>
      </header>
      <RunsClient />
    </div>
  );
}

