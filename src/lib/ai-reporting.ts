import {
  Client,
  Meeting,
  MeetingAction,
  MeetingReportPreview,
  ReportTemplate,
  SummaryResult,
} from "@/lib/types";

function splitIdeas(transcript: string) {
  return transcript
    .split(/\n|(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function detectActionItems(ideas: string[]) {
  const actionPattern =
    /dogovor|slede|rok|posal|priprem|uvesti|testira|delegira|napravi|uradi|azurira/i;

  return ideas.filter((idea) => actionPattern.test(idea)).slice(0, 5);
}

function detectRisks(ideas: string[]) {
  const riskPattern = /kasni|problem|blok|pad|nema|preopterec|rizik|odlaze/i;
  const risks = ideas.filter((idea) => riskPattern.test(idea)).slice(0, 4);

  return risks.length ? risks : ["Nisu detektovani jaci rizici u ovom razgovoru."];
}

function buildSafeClientLabel(client: Client) {
  const base = client.programId === "bdp" ? "BDP" : "MM";
  const hash = Array.from(client.id).reduce(
    (sum, char) => (sum * 31 + char.charCodeAt(0)) % 997,
    17,
  );

  return `Klijent ${base}-${String(hash).padStart(3, "0")}`;
}

function buildIncludedSignals(
  client: Client,
  meeting: Meeting | undefined,
  sourceIds: string[],
  internalNotes?: string,
) {
  const signals = [
    `Program: ${client.programId}`,
    `Moduli: ${client.programModules.join(" / ")}`,
    `Faza rada: ${client.stage}`,
    `Cilj ciklusa: ${client.monthlyGoal}`,
    `Sledeci milestone: ${client.nextMilestone}`,
  ];

  if (meeting) {
    signals.push(`Tip sastanka: ${meeting.type}`);
    signals.push(`Moduli sastanka: ${meeting.modules.join(" / ")}`);
  }

  sourceIds.forEach((sourceId) => {
    const source = client.dataSources.find((item) => item.id === sourceId);
    if (!source) {
      return;
    }

    signals.push(`${source.label}: ${source.summary}`);
    source.metrics.forEach((metric) => signals.push(`${source.label} signal: ${metric}`));
  });

  if (internalNotes?.trim()) {
    signals.push(`Interne napomene: ${internalNotes.trim()}`);
  }

  return signals;
}

function buildPromptPreview(
  template: ReportTemplate,
  safeClientLabel: string,
  signals: string[],
) {
  return [
    `PRE-PROMPT: ${template.prePrompt}`,
    `TIP: ${template.reportType}`,
    `KLIJENT: ${safeClientLabel}`,
    `SIGNALI: ${signals.join(" | ")}`,
    `UPUTSTVO: ${template.prompt}`,
  ].join("\n");
}

export function generateMeetingReportPreview({
  client,
  meeting,
  transcript,
  template,
  internalNotes,
  sourceIds,
}: {
  client: Client;
  meeting?: Meeting;
  transcript: string;
  template: ReportTemplate;
  internalNotes?: string;
  sourceIds: string[];
}): MeetingReportPreview {
  const ideas = splitIdeas(transcript);
  const actionItems = detectActionItems(ideas);
  const keyPoints = ideas.slice(0, 4);
  const riskFlags = detectRisks(ideas);
  const safeClientLabel = buildSafeClientLabel(client);
  const includedSignals = buildIncludedSignals(
    client,
    meeting,
    sourceIds,
    internalNotes,
  );

  return {
    templateId: template.id,
    templateName: template.name,
    reportType: template.reportType,
    overview: `${safeClientLabel} je prosao kroz ${meeting?.title ?? "sastanak"} uz fokus na status, blokere i sledece korake za ${client.programId === "bdp" ? "mesecni ciklus" : "trenutni radni tok"}.`,
    keyPoints: keyPoints.length
      ? keyPoints
      : ["Nema dovoljno sadrzaja za automatsko izdvajanje kljucnih tacaka."],
    actionItems: actionItems.length
      ? actionItems
      : ["Dodati eksplicitne zadatke i rokove u transkript za bolji output."],
    riskFlags,
    suggestedFollowUp:
      "Pre sledeceg sastanka proveriti izvrsenje dogovorenih akcija, status materijala i novi audio zapis ako postoji.",
    safeContext: {
      clientLabel: safeClientLabel,
      removedFields: template.excludedFields,
      includedSignals,
      promptPreview: buildPromptPreview(template, safeClientLabel, includedSignals),
    },
  };
}

export function mergeSuggestedActions({
  existingActions,
  preview,
  dueDate,
}: {
  existingActions: MeetingAction[];
  preview: SummaryResult;
  dueDate: string;
}) {
  const existingTitles = new Set(
    existingActions.map((action) => action.title.trim().toLowerCase()),
  );

  const generated = preview.actionItems
    .filter((item) => !existingTitles.has(item.trim().toLowerCase()))
    .map((item, index) => ({
      id: `ai-action-${Date.now()}-${index}`,
      title: item,
      owner: "Klijent" as const,
      priority: "Srednji" as const,
      completionPercent: 0,
      dueDate,
      done: false,
      sharedWithClient: true,
      reminderBeforeDue: true,
      reminderWhenOverdue: true,
      reminderOnCreate: true,
    }));

  return [...existingActions, ...generated];
}
