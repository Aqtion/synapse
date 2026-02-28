"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SignInDialog } from "@/components/SignInDialog";

export function LandingPage() {
  const [signInOpen, setSignInOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-16 bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Synapse
        </h1>
        <p className="text-lg text-muted-foreground">
          Build and test with sandboxed environments. Create projects, connect
          your GitHub repos, and invite your team.
        </p>
        <Button
          size="lg"
          className="text-base"
          onClick={() => setSignInOpen(true)}
        >
          Get started
        </Button>
      </div>
      <SignInDialog
        open={signInOpen}
        onOpenChange={setSignInOpen}
        callbackURL="/"
      />
    </div>
  );
}
