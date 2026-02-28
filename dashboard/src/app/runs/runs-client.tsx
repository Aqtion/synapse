"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function RunsClient() {
  const runs = useQuery(api.runs.getRecentRuns, {
    limit: 50,
  });

  if (runs === undefined) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 text-xs text-slate-400">
        Loading recent runs…
      </div>
    );
  }

  if (!runs.length) {
    return (
      <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-400">
        No runs have been recorded yet. Trigger a prompt from the dashboard
        once Worker wiring is complete.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/60">
      <table className="min-w-full text-left text-xs text-slate-300">
        <thead className="bg-slate-900/80 text-[11px] uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-3 py-2 font-medium">When</th>
            <th className="px-3 py-2 font-medium">Sandbox</th>
            <th className="px-3 py-2 font-medium">Prompt</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => (
            <tr
              key={run._id}
              className="border-t border-slate-800/80 hover:bg-slate-800/60"
            >
              <td className="px-3 py-2 align-top text-[11px] text-slate-400">
                {new Date(run._creationTime).toLocaleString()}
              </td>
              <td className="px-3 py-2 align-top text-[11px] text-slate-300">
                {run.sandboxId ?? "—"}
              </td>
              <td className="max-w-xs px-3 py-2 align-top text-[11px] text-slate-200">
                <div className="line-clamp-3 wrap-break-word">{run.prompt}</div>
              </td>
              <td className="px-3 py-2 align-top text-[11px]">
                {run.success ? (
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300 ring-1 ring-emerald-500/30">
                    Success
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-300 ring-1 ring-rose-500/30">
                    Failed
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

