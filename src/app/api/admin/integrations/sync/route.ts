import { NextResponse } from "next/server";
import { isAuthApiError, requireAdminApiAccess } from "@/lib/auth";
import { runIntegrationSync } from "@/lib/admin-mutations";

export async function POST(request: Request) {
  try {
    await requireAdminApiAccess();
    const body = await request.json();

    if (!body.integrationId) {
      return NextResponse.json(
        { error: "integrationId je obavezan." },
        { status: 400 },
      );
    }

    const result = await runIntegrationSync({
      integrationId: body.integrationId,
      clientId: body.clientId,
    });

    return NextResponse.json({
      ok: true,
      runCount: result.integrationRuns.length,
    });
  } catch (error) {
    if (isAuthApiError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Neuspesan integration sync.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
