import { NextResponse } from "next/server";
import { createStaffUser } from "@/lib/admin-mutations";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name || !body.email || !body.title || !body.role) {
      return NextResponse.json(
        { error: "Name, email, title i role su obavezni." },
        { status: 400 },
      );
    }

    const result = await createStaffUser({
      name: body.name,
      email: body.email,
      title: body.title,
      role: body.role,
      adminAddon: Boolean(body.adminAddon),
      team: body.team || "Consulting",
      focus: body.focus || "Operativni fokus bice dodat kroz admin setup.",
      specialties: Array.isArray(body.specialties) ? body.specialties : [],
    });

    return NextResponse.json({
      ok: true,
      staffCount: result.staffUsers.length,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Neuspesno kreiranje zaposlenog.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
