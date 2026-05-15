import { NextResponse } from "next/server";
import { isAuthApiError, requireStaffApiClientAccess } from "@/lib/auth";
import {
  saveClientActionBoard,
  upsertClientMeeting,
  updateClientAssignments,
  updateClientDataSources,
} from "@/lib/admin-mutations";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.clientId || !body.action) {
      return NextResponse.json(
        { error: "clientId i action su obavezni." },
        { status: 400 },
      );
    }

    if (body.action === "updateAssignments") {
      await requireStaffApiClientAccess(body.clientId, { managerOnly: true });
      const result = await updateClientAssignments({
        clientId: body.clientId,
        assignments: Array.isArray(body.assignments) ? body.assignments : [],
      });

      return NextResponse.json({
        ok: true,
        clientCount: result.clients.length,
      });
    }

    if (body.action === "updateDataSources") {
      await requireStaffApiClientAccess(body.clientId);
      const result = await updateClientDataSources({
        clientId: body.clientId,
        dataSources: Array.isArray(body.dataSources) ? body.dataSources : [],
        noteTitle: body.noteTitle,
        noteDetails: body.noteDetails,
        noteOwner: body.noteOwner,
      });

      return NextResponse.json({
        ok: true,
        clientCount: result.clients.length,
      });
    }

    if (body.action === "saveActionBoard") {
      await requireStaffApiClientAccess(body.clientId);
      const result = await saveClientActionBoard({
        clientId: body.clientId,
        scope: body.scope === "shared" ? "shared" : "meeting",
        meetingId: body.meetingId,
        actions: Array.isArray(body.actions) ? body.actions : [],
      });

      return NextResponse.json({
        ok: true,
        clientCount: result.clients.length,
      });
    }

    if (body.action === "upsertMeeting") {
      await requireStaffApiClientAccess(body.clientId);
      const result = await upsertClientMeeting({
        clientId: body.clientId,
        meetingId: body.meetingId,
        title: body.title || "",
        type: body.type || "",
        scheduledStartAt: body.scheduledStartAt || "",
        durationMinutes: Number(body.durationMinutes) || 60,
        modules: Array.isArray(body.modules) ? body.modules : [],
        participants: Array.isArray(body.participants) ? body.participants : [],
        status: body.status || "Zakazan",
        summary: body.summary,
        videoUrl: body.videoUrl || "",
        audioUrl: body.audioUrl || "",
        driveFolderUrl: body.driveFolderUrl || "",
        materialsUrl: body.materialsUrl || "",
        recordingsUrl: body.recordingsUrl || "",
      });

      return NextResponse.json({
        ok: true,
        clientCount: result.clients.length,
      });
    }

    return NextResponse.json(
      { error: "Nepoznata action vrednost." },
      { status: 400 },
    );
  } catch (error) {
    if (isAuthApiError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Neuspesna operativna izmena klijenta.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
