import { generateMeetingReportPreview } from "@/lib/ai-reporting";
import { getClientById, loadAppData } from "@/lib/app-data";
import { MeetingReportPreview, ReportTemplate, SummaryResult } from "@/lib/types";

function splitIdeas(transcript: string) {
  return transcript
    .split(/\n|(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function detectActionItems(ideas: string[]) {
  const actionPattern =
    /dogovor|slede|rok|posal|priprem|uvesti|testira|delegira|napravi/i;

  return ideas.filter((idea) => actionPattern.test(idea)).slice(0, 4);
}

function detectRisks(ideas: string[]) {
  const riskPattern = /kasni|problem|blok|pad|nema|preopterec/i;
  const risks = ideas.filter((idea) => riskPattern.test(idea)).slice(0, 3);

  return risks.length ? risks : ["Nisu detektovani jaci rizici u ovom razgovoru."];
}

function buildFallbackResult(body: {
  clientName?: string;
  meetingTitle?: string;
  transcript: string;
}): SummaryResult {
  const ideas = splitIdeas(body.transcript);
  const actionItems = detectActionItems(ideas);
  const keyPoints = ideas.slice(0, 3);
  const riskFlags = detectRisks(ideas);

  return {
    overview: `${body.clientName ?? "Klijent"} je na sastanku "${body.meetingTitle ?? "1:1"}" prosao kroz glavne teme, trenutni status i sledece korake.`,
    keyPoints: keyPoints.length
      ? keyPoints
      : ["Nema dovoljno sadrzaja za automatsko izdvajanje kljucnih tacaka."],
    actionItems: actionItems.length
      ? actionItems
      : ["Dodati eksplicitne zadatke i rokove u transkript za bolji output."],
    riskFlags,
    suggestedFollowUp:
      "Pre sledeceg sastanka proveriti izvrsenje dogovorenih akcija i priloziti novi audio zapis u sistem.",
  };
}

function pickTemplate(
  templates: ReportTemplate[],
  templateId?: string,
  programId?: string,
) {
  if (templateId) {
    return templates.find((template) => template.id === templateId);
  }

  return (
    templates.find((template) => template.programIds.includes(programId ?? "")) ??
    templates[0]
  );
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    clientId?: string;
    meetingId?: string;
    clientName?: string;
    meetingTitle?: string;
    transcript?: string;
    templateId?: string;
    internalNotes?: string;
    includeSourceIds?: string[];
  };

  const transcript = body.transcript?.trim();

  if (!transcript) {
    return Response.json(
      { error: "Transkript je obavezan." },
      { status: 400 },
    );
  }

  const data = await loadAppData();
  const client = body.clientId ? getClientById(data, body.clientId) : undefined;
  const meeting = client?.meetings.find((item) => item.id === body.meetingId);
  const template = pickTemplate(
    data.reportTemplates,
    body.templateId,
    client?.programId,
  );

  if (client && template) {
    const result: MeetingReportPreview = generateMeetingReportPreview({
      client,
      meeting,
      transcript,
      template,
      internalNotes: body.internalNotes,
      sourceIds: Array.isArray(body.includeSourceIds) ? body.includeSourceIds : [],
    });

    return Response.json(result);
  }

  return Response.json(
    buildFallbackResult({
      clientName: body.clientName,
      meetingTitle: body.meetingTitle,
      transcript,
    }),
  );
}
