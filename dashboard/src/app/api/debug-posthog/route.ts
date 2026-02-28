import { NextResponse } from "next/server";

/**
 * Server-side debug: uses PostHog private API (personal API key) to list
 * property definitions, session recordings, and event definitions so you can
 * verify sandboxId exists, replays are stored, and events like $rageclick appear.
 *
 * Where to put the key: dashboard/.env (server-only, never NEXT_PUBLIC_):
 *   POSTHOG_PERSONAL_API_KEY=phx_xxxx
 *   POSTHOG_APP_HOST=https://us.posthog.com   (optional; US default)
 *
 * Create key: PostHog → Settings → Personal API keys → Create.
 * Scopes needed: project:read, property_definition:read, session_recording:read, event_definition:read (or query:read).
 *
 * Call: GET /api/debug-posthog (e.g. http://localhost:3000/api/debug-posthog)
 */
const DEFAULT_APP_HOST = "https://us.posthog.com";

export async function GET() {
  const key = process.env.POSTHOG_PERSONAL_API_KEY?.trim();
  const base = (process.env.POSTHOG_APP_HOST ?? DEFAULT_APP_HOST).replace(/\/$/, "");

  if (!key) {
    return NextResponse.json(
      {
        error: "POSTHOG_PERSONAL_API_KEY is not set",
        hint: "Add it to dashboard/.env (server-only). Create at PostHog → Settings → Personal API keys. Scopes: project:read, property_definition:read, session_recording:read, event_definition:read",
      },
      { status: 500 }
    );
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };

  try {
    const orgRes = await fetch(`${base}/api/organizations/@current`, { headers });
    if (!orgRes.ok) {
      const t = await orgRes.text();
      return NextResponse.json(
        { error: "Failed to get organization", status: orgRes.status, body: t.slice(0, 500) },
        { status: 502 }
      );
    }
    const org = (await orgRes.json()) as {
      id?: string;
      organization?: { id: string };
      projects?: Array<{ id: string | number; name: string }>;
    };
    const orgId = org?.id ?? org?.organization?.id;
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization id in response", org: { id: org?.id, hasProjects: !!org?.projects } },
        { status: 502 }
      );
    }

    let projectId: string | number | undefined;
    let projectName: string | undefined;
    if (org.projects?.length) {
      projectId = org.projects[0].id;
      projectName = org.projects[0].name;
    }
    if (projectId == null) {
      const projectsRes = await fetch(`${base}/api/organizations/${orgId}/projects/`, { headers });
      if (!projectsRes.ok) {
        const t = await projectsRes.text();
        return NextResponse.json(
          { error: "Failed to list projects", status: projectsRes.status, body: t.slice(0, 500) },
          { status: 502 }
        );
      }
      const projects = (await projectsRes.json()) as { results?: Array<{ id: string; name: string }> };
      projectId = projects?.results?.[0]?.id;
      projectName = projects?.results?.[0]?.name;
    }
    if (projectId == null) {
      return NextResponse.json({ error: "No project found", orgId }, { status: 502 });
    }
    const projectIdStr = String(projectId);

    const [propsRes, recordingsRes, eventDefsRes] = await Promise.all([
      fetch(`${base}/api/projects/${projectIdStr}/property_definitions/?limit=200`, { headers }),
      fetch(`${base}/api/projects/${projectIdStr}/session_recordings/?limit=10`, { headers }),
      fetch(`${base}/api/projects/${projectIdStr}/event_definitions/?limit=100`, { headers }),
    ]);

    const propertyDefinitions = propsRes.ok
      ? ((await propsRes.json()) as { results?: Array<{ name: string; type?: string }> }).results ?? []
      : { error: propsRes.status, body: (await propsRes.text()).slice(0, 300) };
    const sessionRecordings = recordingsRes.ok
      ? ((await recordingsRes.json()) as { count?: number; results?: unknown[] })
      : { error: recordingsRes.status, body: (await recordingsRes.text()).slice(0, 300) };
    const eventDefinitions = eventDefsRes.ok
      ? ((await eventDefsRes.json()) as { results?: Array<{ name: string }> }).results ?? []
      : { error: eventDefsRes.status, body: (await eventDefsRes.text()).slice(0, 300) };

    const propNames = Array.isArray(propertyDefinitions)
      ? propertyDefinitions.map((p) => p.name)
      : [];
    const hasSandboxId = propNames.some((n) => n === "sandboxId" || n.toLowerCase().includes("sandbox"));
    const eventNames = Array.isArray(eventDefinitions)
      ? eventDefinitions.map((e) => e.name)
      : [];
    const hasRageclick = eventNames.some((n) => n === "$rageclick" || n.toLowerCase().includes("rage"));

    return NextResponse.json({
      projectId: projectIdStr,
      projectName,
      hint: "Use this to verify: sandboxId in property definitions, $rageclick in event definitions, session_recordings.count > 0.",
      property_definitions: Array.isArray(propertyDefinitions)
        ? { count: propertyDefinitions.length, sample_names: propNames.slice(0, 40), hasSandboxId }
        : propertyDefinitions,
      event_definitions: Array.isArray(eventDefinitions)
        ? { count: eventDefinitions.length, sample_names: eventNames.slice(0, 40), hasRageclick }
        : eventDefinitions,
      session_recordings: sessionRecordings,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Request failed", message }, { status: 500 });
  }
}
