export default function Home() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Cloudflare Worker
          </p>
          <h2 className="mt-2 text-base font-semibold text-slate-50">
            Sandbox API status
          </h2>
          <p className="mt-2 text-xs text-slate-400">
            This dashboard will query the existing Cloudflare Sandbox Worker and
            surface runs, files, and AI-driven edits.
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Convex
          </p>
          <h2 className="mt-2 text-base font-semibold text-slate-50">
            Run history (coming soon)
          </h2>
          <p className="mt-2 text-xs text-slate-400">
            We&apos;ll store a history of prompts, changes, and errors here
            using Convex mutations and queries.
          </p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
            Preview
          </p>
          <h2 className="mt-2 text-base font-semibold text-slate-50">
            Live sandbox previews
          </h2>
          <p className="mt-2 text-xs text-slate-400">
            Use the Files and Runs views to inspect the generated app served by
            your Sandbox instance.
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-sm font-semibold text-slate-50">
          Getting started
        </h2>
        <p className="mt-2 text-xs text-slate-400">
          Configure <code className="rounded bg-slate-950/80 px-1.5 py-0.5">
            NEXT_PUBLIC_WORKER_BASE_URL
          </code>{" "}
          to point at your deployed Cloudflare Worker. The dashboard will then
          call its JSON APIs to initialize sandboxes, list files, and apply AI
          prompts.
        </p>
      </section>
    </div>
  );
}
