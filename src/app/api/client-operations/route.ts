import { NextResponse } from "next/server";
import {
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

    return NextResponse.json(
      { error: "Nepoznata action vrednost." },
      { status: 400 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Neuspesna operativna izmena klijenta.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
