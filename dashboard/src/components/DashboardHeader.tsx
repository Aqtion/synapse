"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "convex/_generated/api";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function DashboardHeader() {
  const pathname = usePathname();
  const params = useParams();
  const user_id = params?.user_id as string | undefined;
  const project_id = params?.project_id as string | undefined;

  const project = useQuery(
    api.projects.getProject,
    project_id ? { projectId: project_id } : "skip",
  );

  if (!user_id) return null;

  const isUserHome = pathname === `/${user_id}` || pathname === `/${user_id}/`;
  const isCreateProject = pathname?.endsWith("/create_project");
  const isUserProfile = pathname?.endsWith("/user");
  const isProjectPage = project_id && !isCreateProject && !isUserProfile;

  const projectsHref = `/${user_id}`;

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-1.5 data-[orientation=vertical]:h-6"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              {isUserHome ? (
                <BreadcrumbPage>Projects</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link href={projectsHref}>Projects</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
            {(isProjectPage || isCreateProject || isUserProfile) && (
              <>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  {isCreateProject && (
                    <BreadcrumbPage>New project</BreadcrumbPage>
                  )}
                  {isUserProfile && (
                    <BreadcrumbPage>Profile</BreadcrumbPage>
                  )}
                  {isProjectPage &&
                    (project === undefined ? (
                      <BreadcrumbPage>…</BreadcrumbPage>
                    ) : project ? (
                      <BreadcrumbPage>{project.name}</BreadcrumbPage>
                    ) : (
                      <BreadcrumbPage>Project</BreadcrumbPage>
                    ))}
                </BreadcrumbItem>
              </>
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  );
}
