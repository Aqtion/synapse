import { SandboxConvexErrorBoundary } from "@/components/SandboxConvexErrorBoundary";
import { SandboxDashboard } from "@/components/SandboxDashboard";

export default function DashboardPage() {
  return (
    <SandboxConvexErrorBoundary>
      <SandboxDashboard />
    </SandboxConvexErrorBoundary>
  );
}
