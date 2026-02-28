import { Card, CardContent } from "@/components/ui/card";

export function SandboxEmptyState() {
  return (
    <Card className="border-dashed text-center py-14 px-6">
      <CardContent className="p-0">
        <p className="text-muted-foreground text-[15px]">
          No sandboxes yet. Create one to get started.
        </p>
      </CardContent>
    </Card>
  );
}
