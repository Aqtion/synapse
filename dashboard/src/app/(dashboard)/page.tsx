import { SandboxConvexErrorBoundary } from "@/components/sandbox/SandboxConvexErrorBoundary";
import { SandboxDashboard } from "@/components/sandbox/SandboxDashboard";

export default function DashboardPage() {
  return (
    <SandboxConvexErrorBoundary>
      <SandboxDashboard />
    </SandboxConvexErrorBoundary>
  );
}
