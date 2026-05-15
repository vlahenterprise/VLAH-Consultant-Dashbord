import { NextResponse } from "next/server";
import { isAuthApiError, requireAdminApiAccess } from "@/lib/auth";
import { createStaffUser } from "@/lib/admin-mutations";

export async function POST(request: Request) {
  try {
    await requireAdminApiAccess();
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
    if (isAuthApiError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Neuspesno kreiranje zaposlenog.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
