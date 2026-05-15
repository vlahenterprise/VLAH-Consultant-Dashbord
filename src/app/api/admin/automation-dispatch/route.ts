import { NextResponse } from "next/server";
import { isAuthApiError, requireAdminApiAccess } from "@/lib/auth";
import { dispatchAutomation } from "@/lib/admin-mutations";

export async function POST(request: Request) {
  try {
    await requireAdminApiAccess();
    const body = await request.json();

    if (!body.queueItemId) {
      return NextResponse.json(
        { error: "queueItemId je obavezan." },
        { status: 400 },
      );
    }

    const result = await dispatchAutomation({
      queueItemId: body.queueItemId,
    });

    return NextResponse.json({
      ok: true,
      historyCount: result.automationDispatchLog.length,
    });
  } catch (error) {
    if (isAuthApiError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Neuspesno slanje automation stavke.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
