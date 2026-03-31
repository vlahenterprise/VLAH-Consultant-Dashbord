import { SummaryResult } from "@/lib/types";

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

export async function POST(request: Request) {
  const body = (await request.json()) as {
    clientName?: string;
    meetingTitle?: string;
    transcript?: string;
  };

  const transcript = body.transcript?.trim();

  if (!transcript) {
    return Response.json(
      { error: "Transcript je obavezan." },
      { status: 400 },
    );
  }

  const ideas = splitIdeas(transcript);
  const actionItems = detectActionItems(ideas);
  const keyPoints = ideas.slice(0, 3);
  const riskFlags = detectRisks(ideas);

  const result: SummaryResult = {
    overview: `${body.clientName ?? "Klijent"} je na sastanku "${body.meetingTitle ?? "1:1"}" prosao kroz glavne blokere, trenutni status i sledece korake. Ovaj response je demo placeholder za kasniji OpenAI summary nad audio fajlom.`,
    keyPoints: keyPoints.length
      ? keyPoints
      : ["Nema dovoljno sadrzaja za automatsko izdvajanje kljucnih tacaka."],
    actionItems: actionItems.length
      ? actionItems
      : ["Dodati eksplicitne zadatke i rokove u transcript za bolji output."],
    riskFlags,
    suggestedFollowUp:
      "Pre sledeceg 1:1 proveriti izvrsenje dogovorenih akcija i priloziti novi audio zapis u sistem.",
  };

  return Response.json(result);
}
