"use client";

import { useParams } from "next/navigation";
import { SandboxConvexErrorBoundary } from "@/components/SandboxConvexErrorBoundary";
import { SandboxDashboard } from "@/components/SandboxDashboard";

export default function ProjectSandboxesPage() {
  const params = useParams();
  const project_id = params?.project_id as string | undefined;

  return (
    <SandboxConvexErrorBoundary>
      <SandboxDashboard projectId={project_id ?? undefined} />
    </SandboxConvexErrorBoundary>
  );
}
