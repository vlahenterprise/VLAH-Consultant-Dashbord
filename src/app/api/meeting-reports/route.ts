import { NextResponse } from "next/server";
import { saveMeetingReport } from "@/lib/admin-mutations";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (
      !body.clientId ||
      !body.meetingId ||
      !body.templateId ||
      !body.expertOwnerId ||
      !body.transcript ||
      !body.actualStartAt ||
      !body.endedAt
    ) {
      return NextResponse.json(
        {
          error:
            "clientId, meetingId, templateId, expertOwnerId, transcript, actualStartAt i endedAt su obavezni.",
        },
        { status: 400 },
      );
    }

    const result = await saveMeetingReport({
      clientId: body.clientId,
      meetingId: body.meetingId,
      templateId: body.templateId,
      expertOwnerId: body.expertOwnerId,
      transcript: body.transcript,
      internalNotes: body.internalNotes,
      actualStartAt: body.actualStartAt,
      endedAt: body.endedAt,
      status: body.status || "Odrzan",
      clientOnTime: Boolean(body.clientOnTime),
      emailSentToClient: Boolean(body.emailSentToClient),
      includeSourceIds: Array.isArray(body.includeSourceIds) ? body.includeSourceIds : [],
      preview: body.preview,
    });

    return NextResponse.json({
      ok: true,
      clientCount: result.clients.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Neuspesno cuvanje izvestaja.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
