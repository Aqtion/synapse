import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sandbox Studio Dashboard",
  description: "Dashboard for managing Cloudflare Sandbox sandboxes and runs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-50`}
      >
        <ConvexClientProvider>
          <div className="min-h-screen flex">
            <aside className="hidden md:flex w-64 flex-col border-r border-slate-800 bg-slate-950/80 px-5 py-6">
              <div className="mb-8">
                <span className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-100">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-sky-500 text-xs font-bold">
                    SS
                  </span>
                  Sandbox Studio
                </span>
                <p className="mt-2 text-xs text-slate-400">
                  Visual dashboard for your Cloudflare Sandbox environments.
                </p>
              </div>
              <nav className="space-y-1 text-sm">
                <NavLink href="/">Overview</NavLink>
                <NavLink href="/runs">Runs</NavLink>
                <NavLink href="/files">Files</NavLink>
                <NavLink href="/ux_telemetry">Telemetry (Hume test)</NavLink>
              </nav>
              <div className="mt-auto pt-6 text-[11px] text-slate-500">
                Connected to existing Cloudflare Worker.
              </div>
            </aside>

            <main className="flex-1 min-w-0 bg-slate-950 px-4 py-4 md:px-8 md:py-6">
              <header className="mb-6 flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-lg font-semibold tracking-tight text-slate-50 md:text-xl">
                    Sandbox dashboard
                  </h1>
                  <p className="mt-1 text-xs text-slate-400 md:text-sm">
                    Inspect and orchestrate the Cloudflare Sandbox Worker from a
                    modern React UI.
                  </p>
                </div>
              </header>
              <TooltipProvider>
                <div className="mx-auto max-w-6xl">{children}</div>
              </TooltipProvider>
            </main>
          </div>
        </ConvexClientProvider>
      </body>
    </html>
  );
}

function NavLink(props: { href: string; children: React.ReactNode }) {
  const { href, children } = props;
  return (
    <Link
      href={href}
      className="block rounded-md px-3 py-2 text-slate-300 hover:bg-slate-800 hover:text-slate-50"
    >
      {children}
    </Link>
  );
}
