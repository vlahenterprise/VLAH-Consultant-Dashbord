"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusChip } from "@/components/status-chip";
import { Client, Meeting, MeetingTemplate } from "@/lib/types";

type MeetingOperationsPanelProps = {
  client: Client;
  meetingTemplates: MeetingTemplate[];
};

type MeetingDraft = {
  title: string;
  type: string;
  scheduledStartAt: string;
  durationMinutes: number;
  modulesText: string;
  participantsText: string;
  status: Meeting["status"];
  summary: string;
  videoUrl: string;
  audioUrl: string;
  driveFolderUrl: string;
  materialsUrl: string;
  recordingsUrl: string;
};

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

function buildMeetingDraft(meeting: Meeting): MeetingDraft {
  return {
    title: meeting.title,
    type: meeting.type,
    scheduledStartAt: meeting.scheduledStartAt,
    durationMinutes: meeting.durationMinutes,
    modulesText: meeting.modules.join(", "),
    participantsText: meeting.participants.join(", "),
    status: meeting.status,
    summary: meeting.summary,
    videoUrl: meeting.recording.videoUrl,
    audioUrl: meeting.recording.audioUrl,
    driveFolderUrl: meeting.recording.driveFolderUrl,
    materialsUrl: meeting.recording.materialsUrl,
    recordingsUrl: meeting.recording.recordingsUrl,
  };
}

function buildMeetingDraftMap(client: Client) {
  return Object.fromEntries(
    client.meetings.map((meeting) => [meeting.id, buildMeetingDraft(meeting)]),
  );
}

function buildNewMeetingDraft(client: Client, template: MeetingTemplate | undefined) {
  const scheduledStartAt = new Date();
  scheduledStartAt.setDate(scheduledStartAt.getDate() + 7);
  scheduledStartAt.setHours(10, 0, 0, 0);

  return {
    title: template?.title ?? "Novi sastanak",
    type: template?.type ?? "Zoom",
    scheduledStartAt: scheduledStartAt.toISOString(),
    durationMinutes: template?.durationMinutes ?? 60,
    modulesText: template?.modules.join(", ") ?? client.programModules.join(", "),
    participantsText: template?.participants.join(", ") ?? client.name,
    status: "Zakazan" as Meeting["status"],
    summary: "Planiran sastanak. Operativni detalji i izvestaj dopunjuju se posle odrzavanja.",
    videoUrl: "#",
    audioUrl: "#",
    driveFolderUrl: client.driveRootUrl,
    materialsUrl: client.driveRootUrl,
    recordingsUrl: client.driveRootUrl,
  };
}

function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function MeetingOperationsPanel({
  client,
  meetingTemplates,
}: MeetingOperationsPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedMeetingId, setSelectedMeetingId] = useState(client.meetings[0]?.id ?? "");
  const [meetingDrafts, setMeetingDrafts] = useState(() => buildMeetingDraftMap(client));
  const [newTemplateId, setNewTemplateId] = useState(meetingTemplates[0]?.id ?? "");
  const [newMeetingDraft, setNewMeetingDraft] = useState(() =>
    buildNewMeetingDraft(client, meetingTemplates[0]),
  );
  const [feedback, setFeedback] = useState("");

  const activeMeetingId =
    client.meetings.find((meeting) => meeting.id === selectedMeetingId)?.id ??
    client.meetings[0]?.id ??
    "";
  const selectedTemplate = useMemo(
    () =>
      meetingTemplates.find((template) => template.id === newTemplateId) ??
      meetingTemplates[0],
    [meetingTemplates, newTemplateId],
  );
  const activeMeeting = client.meetings.find((meeting) => meeting.id === activeMeetingId);
  const activeDraft =
    meetingDrafts[activeMeetingId] ??
    (activeMeeting ? buildMeetingDraft(activeMeeting) : null);

  function updateActiveDraft(patch: Partial<MeetingDraft>) {
    if (!activeMeetingId) {
      return;
    }

    setMeetingDrafts((current) => ({
      ...current,
      [activeMeetingId]: {
        ...(current[activeMeetingId] ?? (activeMeeting ? buildMeetingDraft(activeMeeting) : buildNewMeetingDraft(client, selectedTemplate))),
        ...patch,
      },
    }));
  }

  function applyTemplate(template: MeetingTemplate) {
    setNewTemplateId(template.id);
    setNewMeetingDraft((current) => ({
      ...current,
      title: template.title,
      type: template.type,
      durationMinutes: template.durationMinutes,
      modulesText: template.modules.join(", "),
      participantsText: template.participants.join(", "),
    }));
  }

  async function handleSaveMeeting() {
    if (!activeDraft || !activeMeetingId) {
      return;
    }

    setFeedback("");
    const response = await fetch("/api/client-operations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "upsertMeeting",
        clientId: client.id,
        meetingId: activeMeetingId,
        title: activeDraft.title,
        type: activeDraft.type,
        scheduledStartAt: activeDraft.scheduledStartAt,
        durationMinutes: activeDraft.durationMinutes,
        modules: splitList(activeDraft.modulesText),
        participants: splitList(activeDraft.participantsText),
        status: activeDraft.status,
        summary: activeDraft.summary,
        videoUrl: activeDraft.videoUrl,
        audioUrl: activeDraft.audioUrl,
        driveFolderUrl: activeDraft.driveFolderUrl,
        materialsUrl: activeDraft.materialsUrl,
        recordingsUrl: activeDraft.recordingsUrl,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      setFeedback(payload.error || "Nije uspelo cuvanje sastanka.");
      return;
    }

    setFeedback("Sastanak je osvezen.");
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleCreateMeeting() {
    setFeedback("");

    const response = await fetch("/api/client-operations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "upsertMeeting",
        clientId: client.id,
        title: newMeetingDraft.title,
        type: newMeetingDraft.type,
        scheduledStartAt: newMeetingDraft.scheduledStartAt,
        durationMinutes: newMeetingDraft.durationMinutes,
        modules: splitList(newMeetingDraft.modulesText),
        participants: splitList(newMeetingDraft.participantsText),
        status: newMeetingDraft.status,
        summary: newMeetingDraft.summary,
        videoUrl: newMeetingDraft.videoUrl,
        audioUrl: newMeetingDraft.audioUrl,
        driveFolderUrl: newMeetingDraft.driveFolderUrl,
        materialsUrl: newMeetingDraft.materialsUrl,
        recordingsUrl: newMeetingDraft.recordingsUrl,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      setFeedback(payload.error || "Nije uspelo dodavanje novog sastanka.");
      return;
    }

    setFeedback("Novi sastanak je dodat u cadence klijenta.");
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.04fr_0.96fr]">
      <div className="brand-item p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-foreground">
              Planiranje i log sastanaka
            </p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Ovde se sredjuje operativni sloj sastanka: termin, trajanje, lista prisutnih i linkovi gde tim nalazi Zoom, Drive i materijale.
            </p>
          </div>
          <StatusChip label={`${client.meetings.length} sastanaka`} tone="accent" />
        </div>

        {activeDraft ? (
          <div className="mt-4 grid gap-3">
            <label className="grid gap-2 text-sm text-muted">
              <span>Aktivni sastanak</span>
              <select
                className="brand-input"
                value={activeMeetingId}
                onChange={(event) => setSelectedMeetingId(event.target.value)}
              >
                {client.meetings.map((meeting) => (
                  <option key={meeting.id} value={meeting.id}>
                    {meeting.title}
                  </option>
                ))}
              </select>
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-2 text-sm text-muted">
                <span>Naziv</span>
                <input
                  className="brand-input"
                  value={activeDraft.title}
                  onChange={(event) => updateActiveDraft({ title: event.target.value })}
                />
              </label>
              <label className="grid gap-2 text-sm text-muted">
                <span>Tip</span>
                <input
                  className="brand-input"
                  value={activeDraft.type}
                  onChange={(event) => updateActiveDraft({ type: event.target.value })}
                />
              </label>
              <label className="grid gap-2 text-sm text-muted">
                <span>Planirani termin</span>
                <input
                  className="brand-input"
                  type="datetime-local"
                  value={toDateTimeLocalValue(activeDraft.scheduledStartAt)}
                  onChange={(event) =>
                    updateActiveDraft({
                      scheduledStartAt: toIsoOrFallback(
                        event.target.value,
                        activeDraft.scheduledStartAt,
                      ),
                    })
                  }
                />
              </label>
              <label className="grid gap-2 text-sm text-muted">
                <span>Trajanje u minutima</span>
                <input
                  className="brand-input"
                  type="number"
                  min="15"
                  max="240"
                  step="15"
                  value={activeDraft.durationMinutes}
                  onChange={(event) =>
                    updateActiveDraft({
                      durationMinutes: Number(event.target.value) || 60,
                    })
                  }
                />
              </label>
              <label className="grid gap-2 text-sm text-muted">
                <span>Moduli</span>
                <input
                  className="brand-input"
                  value={activeDraft.modulesText}
                  onChange={(event) =>
                    updateActiveDraft({ modulesText: event.target.value })
                  }
                  placeholder="Operations, Finance"
                />
              </label>
              <label className="grid gap-2 text-sm text-muted">
                <span>Status</span>
                <select
                  className="brand-input"
                  value={activeDraft.status}
                  onChange={(event) =>
                    updateActiveDraft({
                      status: event.target.value as Meeting["status"],
                    })
                  }
                >
                  <option value="Zakazan">Zakazan</option>
                  <option value="Odrzan">Odrzan</option>
                  <option value="Potreban follow-up">Potreban follow-up</option>
                </select>
              </label>
            </div>

            <label className="grid gap-2 text-sm text-muted">
              <span>Prisutni</span>
              <textarea
                className="brand-input min-h-[90px] resize-y"
                value={activeDraft.participantsText}
                onChange={(event) =>
                  updateActiveDraft({ participantsText: event.target.value })
                }
                placeholder="Klijent, ekspert 1, ekspert 2"
              />
            </label>

            <label className="grid gap-2 text-sm text-muted">
              <span>Kratka operativna napomena</span>
              <textarea
                className="brand-input min-h-[100px] resize-y"
                value={activeDraft.summary}
                onChange={(event) => updateActiveDraft({ summary: event.target.value })}
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <input
                className="brand-input"
                value={activeDraft.videoUrl}
                onChange={(event) => updateActiveDraft({ videoUrl: event.target.value })}
                placeholder="Zoom / video link"
              />
              <input
                className="brand-input"
                value={activeDraft.audioUrl}
                onChange={(event) => updateActiveDraft({ audioUrl: event.target.value })}
                placeholder="Audio link"
              />
              <input
                className="brand-input"
                value={activeDraft.driveFolderUrl}
                onChange={(event) =>
                  updateActiveDraft({ driveFolderUrl: event.target.value })
                }
                placeholder="Drive folder"
              />
              <input
                className="brand-input"
                value={activeDraft.materialsUrl}
                onChange={(event) =>
                  updateActiveDraft({ materialsUrl: event.target.value })
                }
                placeholder="Materijali"
              />
              <input
                className="brand-input md:col-span-2"
                value={activeDraft.recordingsUrl}
                onChange={(event) =>
                  updateActiveDraft({ recordingsUrl: event.target.value })
                }
                placeholder="Lokacija snimaka"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="brand-button disabled:cursor-not-allowed disabled:opacity-70"
                disabled={isPending}
                onClick={handleSaveMeeting}
              >
                Sacuvaj sastanak
              </button>
              {feedback ? <p className="text-sm text-muted">{feedback}</p> : null}
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">
            Ovaj klijent jos nema nijedan sastanak za uredjivanje.
          </p>
        )}
      </div>

      <div className="brand-item p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-foreground">
              Dodaj novi sastanak iz templejta
            </p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Kada treba novi monthly review, kickoff ili 1:1 follow-up, ovde pravis novi termin bez izlaska iz kartice klijenta.
            </p>
          </div>
          {selectedTemplate ? (
            <StatusChip label={selectedTemplate.timingWindow} tone="info" />
          ) : null}
        </div>

        <div className="mt-4 grid gap-3">
          <label className="grid gap-2 text-sm text-muted">
            <span>Meeting template</span>
            <select
              className="brand-input"
              value={selectedTemplate?.id ?? ""}
              onChange={(event) => {
                const template = meetingTemplates.find(
                  (item) => item.id === event.target.value,
                );
                if (template) {
                  applyTemplate(template);
                }
              }}
            >
              {meetingTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.title}
                </option>
              ))}
            </select>
          </label>

          {selectedTemplate ? (
            <div className="rounded-[18px] border border-white/8 bg-black/12 px-4 py-4">
              <div className="flex flex-wrap gap-2">
                <StatusChip label={selectedTemplate.type} tone="accent" />
                {selectedTemplate.modules.map((module) => (
                  <StatusChip key={module} label={module} tone="neutral" />
                ))}
              </div>
              <div className="mt-3 space-y-2 text-sm text-muted">
                {selectedTemplate.notes.map((note) => (
                  <p key={note}>- {note}</p>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-2 text-sm text-muted">
              <span>Planirani termin</span>
              <input
                className="brand-input"
                type="datetime-local"
                value={toDateTimeLocalValue(newMeetingDraft.scheduledStartAt)}
                onChange={(event) =>
                  setNewMeetingDraft((current) => ({
                    ...current,
                    scheduledStartAt: toIsoOrFallback(
                      event.target.value,
                      current.scheduledStartAt,
                    ),
                  }))
                }
              />
            </label>
            <label className="grid gap-2 text-sm text-muted">
              <span>Trajanje</span>
              <input
                className="brand-input"
                type="number"
                min="15"
                max="240"
                step="15"
                value={newMeetingDraft.durationMinutes}
                onChange={(event) =>
                  setNewMeetingDraft((current) => ({
                    ...current,
                    durationMinutes: Number(event.target.value) || 60,
                  }))
                }
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm text-muted">
            <span>Prisutni</span>
            <textarea
              className="brand-input min-h-[90px] resize-y"
              value={newMeetingDraft.participantsText}
              onChange={(event) =>
                setNewMeetingDraft((current) => ({
                  ...current,
                  participantsText: event.target.value,
                }))
              }
            />
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <input
              className="brand-input"
              value={newMeetingDraft.driveFolderUrl}
              onChange={(event) =>
                setNewMeetingDraft((current) => ({
                  ...current,
                  driveFolderUrl: event.target.value,
                }))
              }
              placeholder="Drive folder"
            />
            <input
              className="brand-input"
              value={newMeetingDraft.materialsUrl}
              onChange={(event) =>
                setNewMeetingDraft((current) => ({
                  ...current,
                  materialsUrl: event.target.value,
                }))
              }
              placeholder="Materijali"
            />
          </div>

          <button
            type="button"
            className="brand-button disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isPending}
            onClick={handleCreateMeeting}
          >
            Dodaj novi sastanak
          </button>
        </div>
      </div>
    </div>
  );
}
