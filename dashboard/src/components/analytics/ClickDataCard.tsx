"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MousePointer2 } from "lucide-react";

export function ClickDataCard() {
  return (
    <Card className="col-span-2 border bg-muted/30">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <MousePointer2 className="size-4" />
          Click data
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Click data for this session will appear here once available.
        </p>
      </CardContent>
    </Card>
  );
}
