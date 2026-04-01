import { NextResponse } from "next/server";
import { importBdpSchedule } from "@/lib/admin-mutations";
import { BdpImportRow } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rows = (Array.isArray(body.rows) ? body.rows : []) as BdpImportRow[];

    if (!rows.length) {
      return NextResponse.json(
        { error: "Import batch nema nijedan red." },
        { status: 400 },
      );
    }

    const validRows = rows.filter((row) => row.clientName?.trim());

    if (!validRows.length) {
      return NextResponse.json(
        { error: "Nijedan red nema validno ime klijenta." },
        { status: 400 },
      );
    }

    const result = await importBdpSchedule(validRows);

    return NextResponse.json({
      ok: true,
      importedRows: validRows.length,
      clientCount: result.clients.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Neuspesan BDP import.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
