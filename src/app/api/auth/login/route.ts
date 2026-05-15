import { NextResponse } from "next/server";
import {
  applySessionCookie,
  authenticateCredentials,
  getActorHomeHref,
} from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.mode || !body.email || !body.password) {
      return NextResponse.json(
        { error: "mode, email i password su obavezni." },
        { status: 400 },
      );
    }

    if (body.mode !== "staff" && body.mode !== "client") {
      return NextResponse.json(
        { error: "Nepoznat tip prijave." },
        { status: 400 },
      );
    }

    const actor = await authenticateCredentials({
      mode: body.mode,
      email: body.email,
      password: body.password,
    });

    if (!actor) {
      return NextResponse.json(
        { error: "Email ili lozinka nisu ispravni." },
        { status: 401 },
      );
    }

    const response = NextResponse.json({
      ok: true,
      redirectTo: getActorHomeHref(actor),
    });

    applySessionCookie(response, actor);

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Prijava nije uspela.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
