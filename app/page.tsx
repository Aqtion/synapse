"use client";

import { useQuery } from "convex/react";
import { api } from "@/packages/backend/convex/_generated/api";

export default function Home() {
  const healthData = useQuery(api.health.health);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background font-sans">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center py-32 px-16 bg-background">
        <div className="flex flex-col items-center gap-6 text-center">
          <h1 className="text-3xl font-semibold leading-10 tracking-tight text-foreground">
            Convex Health Status
          </h1>

          {healthData ? (
            <div className="flex flex-col gap-4 w-full max-w-md">
              <div className="rounded-sm border border-border p-6 bg-card">
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      healthData.status === "healthy"
                        ? "bg-green-500"
                        : "bg-red-500"
                    }`}
                  />
                  <span className="text-lg font-medium text-foreground">
                    Status: {healthData.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div>
                    <span className="font-medium">Service:</span> {healthData.service}
                  </div>
                  <div>
                    <span className="font-medium">Timestamp:</span>{" "}
                    {new Date(healthData.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">
              Loading health status...
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
