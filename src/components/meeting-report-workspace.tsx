"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusChip } from "@/components/status-chip";
import {
  Client,
  Meeting,
  MeetingReportPreview,
  ReportTemplate,
  StaffUser,
} from "@/lib/types";

type MeetingReportWorkspaceProps = {
  client: Client;
  staffUsers: StaffUser[];
  reportTemplates: ReportTemplate[];
};

function getMeetingById(client: Client, meetingId: string) {
  return client.meetings.find((meeting) => meeting.id === meetingId) ?? client.meetings[0];
}

function toDateTimeLocalValue(value: string) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function toIsoOrFallback(value: string, fallback: string) {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toISOString();
}

export function MeetingReportWorkspace({
  client,
  staffUsers,
  reportTemplates,
}: MeetingReportWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const assignedExperts = useMemo(
    () =>
      Array.from(
        new Set(client.assignments.map((assignment) => assignment.consultantId)),
      )
        .map((consultantId) =>
          staffUsers.find((staff) => staff.id === consultantId),
        )
        .filter((staff): staff is StaffUser => Boolean(staff)),
    [client.assignments, staffUsers],
  );
  const templates = useMemo(
    () =>
      reportTemplates.filter((template) => template.programIds.includes(client.programId)),
    [client.programId, reportTemplates],
  );
  const [meetingId, setMeetingId] = useState(client.meetings[0]?.id ?? "");
  const [templateId, setTemplateId] = useState(templates[0]?.id ?? reportTemplates[0]?.id ?? "");
  const initialMeeting = getMeetingById(client, meetingId);
  const [expertOwnerId, setExpertOwnerId] = useState(
    assignedExperts[0]?.id ?? client.assignments[0]?.consultantId ?? "",
  );
  const [transcript, setTranscript] = useState(initialMeeting?.transcriptPreview ?? "");
  const [internalNotes, setInternalNotes] = useState("");
  const [actualStartAt, setActualStartAt] = useState(
    initialMeeting?.actualStartAt ?? initialMeeting?.scheduledStartAt ?? "",
  );
  const [endedAt, setEndedAt] = useState(
    initialMeeting?.endedAt ?? initialMeeting?.scheduledStartAt ?? "",
  );
  const [status, setStatus] = useState<Meeting["status"]>(
    initialMeeting?.status ?? "Odrzan",
  );
  const [clientOnTime, setClientOnTime] = useState(initialMeeting?.clientOnTime ?? true);
  const [emailSentToClient, setEmailSentToClient] = useState(
    initialMeeting?.emailSentToClient ?? false,
  );
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>(
    client.dataSources
      .filter((source) => source.status !== "Ceka sync")
      .map((source) => source.id),
  );
  const [preview, setPreview] = useState<MeetingReportPreview | null>(null);
  const [feedback, setFeedback] = useState("");
  const meeting = getMeetingById(client, meetingId);
  const resolvedTemplateId =
    templates.find((template) => template.id === templateId)?.id ?? templates[0]?.id ?? "";
  const resolvedExpertOwnerId =
    assignedExperts.find((expert) => expert.id === expertOwnerId)?.id ??
    assignedExperts[0]?.id ??
    "";
  const selectedTemplate =
    templates.find((template) => template.id === resolvedTemplateId) ?? templates[0] ?? null;

  function syncMeeting(meetingValue: Meeting | undefined) {
    if (!meetingValue) {
      return;
    }

    setTranscript(meetingValue.transcriptPreview ?? "");
    setActualStartAt(meetingValue.actualStartAt ?? meetingValue.scheduledStartAt);
    setEndedAt(meetingValue.endedAt ?? meetingValue.scheduledStartAt);
    setStatus(meetingValue.status);
    setClientOnTime(meetingValue.clientOnTime);
    setEmailSentToClient(meetingValue.emailSentToClient);
    setPreview(null);
  }

  async function handleGenerate() {
    setFeedback("");

    const response = await fetch("/api/meeting-summary", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId: client.id,
        meetingId,
        templateId: resolvedTemplateId,
        transcript,
        internalNotes,
        includeSourceIds: selectedSourceIds,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setFeedback(payload.error || "Nije uspelo generisanje AI izvestaja.");
      return;
    }

    setPreview(payload as MeetingReportPreview);
  }

  async function handleSave() {
    setFeedback("");

    const response = await fetch("/api/meeting-reports", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        clientId: client.id,
        meetingId,
        templateId: resolvedTemplateId,
        expertOwnerId: resolvedExpertOwnerId,
        transcript,
        internalNotes,
        actualStartAt,
        endedAt,
        status,
        clientOnTime,
        emailSentToClient,
        includeSourceIds: selectedSourceIds,
        preview,
      }),
    });

    const payload = await response.json();

    if (!response.ok) {
      setFeedback(payload.error || "Nije uspelo cuvanje izvestaja.");
      return;
    }

    setFeedback("Izvestaj je sacuvan na sastanak i akcije su osvezene.");
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="brand-item p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-foreground">
              Operativni unos posle sastanka
            </p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Ekspert bira sastanak, template i izvore signala, pa cuva izvestaj bez slanja licnih podataka u AI sloj.
            </p>
          </div>
          <StatusChip label="PII zasticen" tone="info" />
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="grid gap-2 text-sm text-muted">
            <span>Sastanak</span>
            <select
              className="brand-input"
              value={meetingId}
              onChange={(event) => {
                const nextMeeting = getMeetingById(client, event.target.value);
                setMeetingId(event.target.value);
                syncMeeting(nextMeeting);
              }}
            >
              {client.meetings.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm text-muted">
            <span>Vlasnik izvestaja</span>
            <select
              className="brand-input"
              value={resolvedExpertOwnerId}
              onChange={(event) => setExpertOwnerId(event.target.value)}
            >
              {assignedExperts.map((expert) => (
                <option key={expert.id} value={expert.id}>
                  {expert.name} / {expert.title}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm text-muted">
            <span>AI template</span>
            <select
              className="brand-input"
              value={resolvedTemplateId}
              onChange={(event) => setTemplateId(event.target.value)}
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} / {template.reportType}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm text-muted">
            <span>Status sastanka</span>
            <select
              className="brand-input"
              value={status}
              onChange={(event) => setStatus(event.target.value as Meeting["status"])}
            >
              <option value="Odrzan">Odrzan</option>
              <option value="Potreban follow-up">Potreban follow-up</option>
              <option value="Zakazan">Zakazan</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm text-muted">
            <span>Stvarni pocetak</span>
            <input
              className="brand-input"
              type="datetime-local"
              value={toDateTimeLocalValue(actualStartAt)}
              onChange={(event) =>
                setActualStartAt(
                  toIsoOrFallback(
                    event.target.value,
                    meeting?.actualStartAt ?? meeting?.scheduledStartAt ?? actualStartAt,
                  ),
                )
              }
            />
          </label>

          <label className="grid gap-2 text-sm text-muted">
            <span>Kraj sastanka</span>
            <input
              className="brand-input"
              type="datetime-local"
              value={toDateTimeLocalValue(endedAt)}
              onChange={(event) =>
                setEndedAt(
                  toIsoOrFallback(
                    event.target.value,
                    meeting?.endedAt ?? meeting?.scheduledStartAt ?? endedAt,
                  ),
                )
              }
            />
          </label>
        </div>

        {selectedTemplate ? (
          <div className="mt-4 rounded-[20px] border border-white/8 bg-black/12 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">{selectedTemplate.name}</p>
                <p className="mt-1 text-sm text-muted">{selectedTemplate.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusChip label={selectedTemplate.reportType} tone="accent" />
                <StatusChip label={selectedTemplate.audience} tone="neutral" />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedTemplate.outputSections.map((section) => (
                <span key={section} className="brand-pill">
                  {section}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-3 text-sm text-muted">
            <input
              type="checkbox"
              checked={clientOnTime}
              onChange={(event) => setClientOnTime(event.target.checked)}
            />
            Klijent je dosao na vreme
          </label>
          <label className="flex items-center gap-3 text-sm text-muted">
            <input
              type="checkbox"
              checked={emailSentToClient}
              onChange={(event) => setEmailSentToClient(event.target.checked)}
            />
            Email izvestaj je vec poslat
          </label>
        </div>

        <div className="mt-5 rounded-[20px] border border-white/8 bg-black/12 px-4 py-4">
          <p className="font-semibold text-foreground">Izvori koji ulaze u AI signal</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {client.dataSources.map((source) => {
              const active = selectedSourceIds.includes(source.id);
              return (
                <button
                  key={source.id}
                  type="button"
                  className={active ? "brand-button-secondary" : "brand-pill"}
                  onClick={() =>
                    setSelectedSourceIds((current) =>
                      current.includes(source.id)
                        ? current.filter((item) => item !== source.id)
                        : [...current, source.id],
                    )
                  }
                >
                  {source.label}
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-muted">
            AI sloj ne dobija ime, email, telefon ni naziv firme. U prompt ide samo anonimizovan klijent, program, moduli, milestone i odabrani operativni signali.
          </p>
        </div>

        <textarea
          className="brand-input mt-5 min-h-[220px] resize-y"
          placeholder="Nalepi transkript ili operativne beleznice sa sastanka..."
          value={transcript}
          onChange={(event) => setTranscript(event.target.value)}
        />

        <textarea
          className="brand-input mt-4 min-h-[120px] resize-y"
          placeholder="Dodatna interna napomena eksperta..."
          value={internalNotes}
          onChange={(event) => setInternalNotes(event.target.value)}
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="brand-button disabled:cursor-not-allowed disabled:opacity-70"
            disabled={
              isPending ||
              !transcript.trim() ||
              !meetingId ||
              !selectedTemplate ||
              !resolvedExpertOwnerId
            }
            onClick={handleGenerate}
          >
            Generisi AI preview
          </button>
          <button
            type="button"
            className="brand-button-secondary disabled:cursor-not-allowed disabled:opacity-70"
            disabled={
              isPending ||
              !transcript.trim() ||
              !meetingId ||
              !selectedTemplate ||
              !resolvedExpertOwnerId
            }
            onClick={handleSave}
          >
            Sacuvaj izvestaj
          </button>
          {feedback ? <p className="text-sm text-muted">{feedback}</p> : null}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="brand-item p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-foreground">AI preview</p>
              <p className="mt-1 text-sm text-muted">
                Template, anonimizovan kontekst i predlog izvestaja.
              </p>
            </div>
            {preview ? (
              <StatusChip label={preview.reportType} tone="accent" />
            ) : (
              <StatusChip label="Ceka generisanje" tone="neutral" />
            )}
          </div>

          {preview ? (
            <div className="mt-4 space-y-4 text-sm leading-6">
              <div>
                <p className="font-semibold text-foreground">{preview.templateName}</p>
                <p className="mt-1 text-muted">{preview.overview}</p>
              </div>

              <div>
                <p className="font-semibold text-foreground">Kljucne tacke</p>
                <div className="mt-2 space-y-2 text-muted">
                  {preview.keyPoints.map((item) => (
                    <p key={item}>- {item}</p>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-semibold text-foreground">Predlozene akcije</p>
                <div className="mt-2 space-y-2 text-muted">
                  {preview.actionItems.map((item) => (
                    <p key={item}>- {item}</p>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-semibold text-foreground">Rizici</p>
                <div className="mt-2 space-y-2 text-muted">
                  {preview.riskFlags.map((item) => (
                    <p key={item}>- {item}</p>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">
              Generisi preview da vidis kako izgleda izvestaj pre cuvanja.
            </p>
          )}
        </div>

        <div className="brand-item p-5">
          <p className="text-base font-semibold text-foreground">Bezbedan kontekst za AI</p>
          {preview ? (
            <>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusChip label={preview.safeContext.clientLabel} tone="info" />
                <StatusChip
                  label={`${selectedSourceIds.length} izvora u signalu`}
                  tone="accent"
                />
                {preview.safeContext.removedFields.map((item) => (
                  <StatusChip key={item} label={`bez ${item}`} tone="neutral" />
                ))}
              </div>
              <div className="mt-4 space-y-2 text-sm text-muted">
                {preview.safeContext.includedSignals.map((signal) => (
                  <p key={signal}>- {signal}</p>
                ))}
              </div>
              <div className="mt-4 rounded-[18px] border border-white/8 bg-white/4 px-4 py-4">
                <p className="font-semibold text-foreground">Prompt preview</p>
                <pre className="mt-3 whitespace-pre-wrap text-xs leading-6 text-muted">
                  {preview.safeContext.promptPreview}
                </pre>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted">
              Ovde ce se pojaviti tacno sta AI dobija, bez licnih podataka klijenta.
            </p>
          )}
        </div>

        <div className="brand-item p-5">
          <p className="text-base font-semibold text-foreground">Aktivni sastanak</p>
          {meeting ? (
            <div className="mt-3 space-y-2 text-sm text-muted">
              <p>{meeting.title}</p>
              <p>{meeting.type}</p>
              <p>Planirano: {meeting.scheduledStartAt}</p>
              <p>Materijali: {meeting.recording.materialsUrl}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">Nema dostupnog sastanka za obradu.</p>
          )}
        </div>
      </div>
    </div>
  );
}
