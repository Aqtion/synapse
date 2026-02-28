import { NextResponse } from "next/server";

const SECRET = process.env.MODAL_SERVICE_SECRET;

function unauthorized() {
  return NextResponse.json({ error: "Invalid service secret" }, { status: 401 });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as {
    serviceSecret?: string;
    taskId?: string;
    result?: unknown;
  };
  const secret = body?.serviceSecret ?? request.headers.get("x-service-secret") ?? "";
  if (!SECRET || SECRET !== secret) return unauthorized();
  return NextResponse.json({
    ok: true,
    taskId: body.taskId ?? "",
    received: body.result,
  });
}
