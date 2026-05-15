import { NextResponse } from "next/server";
import { isAuthApiError, requireAdminApiAccess } from "@/lib/auth";
import { updateReportTemplate } from "@/lib/admin-mutations";

export async function PUT(request: Request) {
  try {
    await requireAdminApiAccess();
    const body = await request.json();

    if (!body.templateId || !body.name || !body.reportType || !body.prePrompt || !body.prompt) {
      return NextResponse.json(
        { error: "templateId, name, reportType, prePrompt i prompt su obavezni." },
        { status: 400 },
      );
    }

    const result = await updateReportTemplate({
      templateId: body.templateId,
      name: body.name,
      reportType: body.reportType,
      audience: body.audience || "Interno",
      description: body.description || "",
      prePrompt: body.prePrompt,
      prompt: body.prompt,
      outputSections: Array.isArray(body.outputSections) ? body.outputSections : [],
    });

    return NextResponse.json({
      ok: true,
      templateCount: result.reportTemplates.length,
    });
  } catch (error) {
    if (isAuthApiError(error)) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Neuspesan update report templata.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
