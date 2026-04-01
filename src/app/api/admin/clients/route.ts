import { NextResponse } from "next/server";
import { createClient } from "@/lib/admin-mutations";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name || !body.company || !body.email || !body.programId) {
      return NextResponse.json(
        { error: "Name, company, email i program su obavezni." },
        { status: 400 },
      );
    }

    const result = await createClient({
      name: body.name,
      company: body.company,
      email: body.email,
      phone: body.phone,
      city: body.city || "Beograd",
      timezone: body.timezone,
      programId: body.programId,
      managerId: body.managerId,
      assignments: Array.isArray(body.assignments) ? body.assignments : [],
    });

    return NextResponse.json({
      ok: true,
      clientCount: result.clients.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Neuspesno kreiranje klijenta.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
