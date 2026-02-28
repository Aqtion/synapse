"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Plus, Share2 } from "lucide-react";
import Link from "next/link";
import { ShareProjectDialog } from "@/components/ShareProjectDialog";

export default function UserProjectsPage() {
  const params = useParams();
  const user_id = params?.user_id as string | undefined;
  const projects = useQuery(api.projects.listProjectsForUser);
  const [shareProject, setShareProject] = useState<{ id: string; name: string } | null>(null);

  if (projects === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  const empty = projects.length === 0;

  return (
    <div className="px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Button asChild>
          <Link href={`/${user_id}/create_project`}>
            <Plus className="size-4 mr-2" />
            New project
          </Link>
        </Button>
      </div>

      {empty ? (
        <div className="rounded-lg border border-dashed border-muted-foreground/40 p-12 text-center">
          <p className="text-muted-foreground mb-4">
            You don&apos;t have any projects yet. Create one to get started.
          </p>
          <Button asChild>
            <Link href={`/${user_id}/create_project`}>
              <Plus className="size-4 mr-2" />
              Create your first project
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="group relative rounded-lg border bg-card p-4 hover:border-primary/50 hover:shadow transition-colors"
            >
              <Link href={`/${user_id}/${project.id}`} className="block pr-8">
                <h2 className="font-semibold truncate">{project.name}</h2>
                {project.githubRepo && (
                  <p className="text-sm text-muted-foreground truncate mt-1">
                    {project.githubRepo}
                  </p>
                )}
                {project.projectType && (
                  <span className="inline-block mt-2 text-xs text-muted-foreground capitalize">
                    {project.projectType}
                  </span>
                )}
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.preventDefault();
                  setShareProject({ id: project.id, name: project.name });
                }}
                aria-label="Share project"
              >
                <Share2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {shareProject && (
        <ShareProjectDialog
          open={!!shareProject}
          onOpenChange={(open) => !open && setShareProject(null)}
          projectId={shareProject.id}
          projectName={shareProject.name}
        />
      )}
    </div>
  );
}
