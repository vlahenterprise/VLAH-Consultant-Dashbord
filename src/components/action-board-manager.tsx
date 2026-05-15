"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusChip } from "@/components/status-chip";
import { Client, MeetingAction } from "@/lib/types";

type ActionBoardManagerProps = {
  client: Client;
};

type BoardDrafts = Record<string, MeetingAction[]>;

function cloneActions(actions: MeetingAction[]) {
  return actions.map((action) => ({ ...action }));
}

function buildBoardDrafts(client: Client): BoardDrafts {
  return {
    shared: cloneActions(client.sharedActionBoard),
    ...Object.fromEntries(
      client.meetings.map((meeting) => [meeting.id, cloneActions(meeting.actions)]),
    ),
  };
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

function createEmptyAction(clientName: string): MeetingAction {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7);

  return {
    id: "",
    title: `${clientName} follow-up`,
    owner: "Klijent",
    priority: "Srednji",
    completionPercent: 0,
    dueDate: dueDate.toISOString(),
    done: false,
    sharedWithClient: true,
    reminderBeforeDue: true,
    reminderWhenOverdue: true,
    reminderOnCreate: true,
  };
}

export function ActionBoardManager({ client }: ActionBoardManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const canUseSharedBoard =
    client.programId === "bdp" || client.sharedActionBoard.length > 0;
  const [scope, setScope] = useState<"shared" | "meeting">(
    canUseSharedBoard ? "shared" : "meeting",
  );
  const [meetingId, setMeetingId] = useState(client.meetings[0]?.id ?? "");
  const [boards, setBoards] = useState<BoardDrafts>(() => buildBoardDrafts(client));
  const [feedback, setFeedback] = useState("");
  const [referenceNow] = useState(() => Date.now());

  const resolvedMeetingId =
    client.meetings.find((meeting) => meeting.id === meetingId)?.id ??
    client.meetings[0]?.id ??
    "";
  const currentKey = scope === "shared" ? "shared" : resolvedMeetingId;
  const currentMeeting =
    scope === "meeting"
      ? client.meetings.find((meeting) => meeting.id === resolvedMeetingId) ?? null
      : null;
  const currentActions = useMemo(() => boards[currentKey] ?? [], [boards, currentKey]);

  const stats = useMemo(() => {
    const completed = currentActions.filter((action) => action.done).length;
    const overdue = currentActions.filter(
      (action) => !action.done && new Date(action.dueDate).getTime() < referenceNow,
    ).length;
    const shared = currentActions.filter((action) => action.sharedWithClient).length;

    return {
      total: currentActions.length,
      completed,
      overdue,
      shared,
    };
  }, [currentActions, referenceNow]);

  function updateCurrentBoard(
    updater: (actions: MeetingAction[]) => MeetingAction[],
  ) {
    setBoards((current) => ({
      ...current,
      [currentKey]: updater(current[currentKey] ?? []),
    }));
  }

  function addAction() {
    updateCurrentBoard((actions) => [...actions, createEmptyAction(client.name)]);
  }

  function removeAction(index: number) {
    updateCurrentBoard((actions) => actions.filter((_, itemIndex) => itemIndex !== index));
  }

  function updateAction(index: number, patch: Partial<MeetingAction>) {
    updateCurrentBoard((actions) =>
      actions.map((action, itemIndex) => {
        if (itemIndex !== index) {
          return action;
        }

        const nextAction = { ...action, ...patch };
        if (patch.done === true) {
          nextAction.completionPercent = 100;
        }

        if (patch.done === false && nextAction.completionPercent === 100) {
          nextAction.completionPercent = 0;
        }

        return nextAction;
      }),
    );
  }

  async function handleSave() {
    setFeedback("");

    const response = await fetch("/api/client-operations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "saveActionBoard",
        clientId: client.id,
        scope,
        meetingId: scope === "meeting" ? resolvedMeetingId : undefined,
        actions: currentActions,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      setFeedback(payload.error || "Nije uspelo cuvanje akcione liste.");
      return;
    }

    setFeedback("Akciona lista je sacuvana.");
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[0.96fr_1.04fr]">
      <div className="brand-item p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-foreground">
              Akciona lista klijenta
            </p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Ovde se vodi stvarna realizacija: task, odgovorna strana, procenat zavrsenja, rok i email reminder pravila.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusChip label={`${stats.total} taskova`} tone="accent" />
            <StatusChip label={`${stats.completed} zavrseno`} tone="success" />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {canUseSharedBoard ? (
            <button
              type="button"
              className={scope === "shared" ? "brand-button" : "brand-button-secondary"}
              onClick={() => setScope("shared")}
            >
              Zajednicka action lista
            </button>
          ) : null}
          <button
            type="button"
            className={scope === "meeting" ? "brand-button" : "brand-button-secondary"}
            onClick={() => setScope("meeting")}
          >
            Akcije po sastanku
          </button>
        </div>

        {scope === "meeting" ? (
          <div className="mt-4 grid gap-2 text-sm text-muted">
            <span>Izaberi sastanak cije akcije uredjujes</span>
            <select
              className="brand-input"
              value={resolvedMeetingId}
              onChange={(event) => setMeetingId(event.target.value)}
            >
              {client.meetings.map((meeting) => (
                <option key={meeting.id} value={meeting.id}>
                  {meeting.title}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="mt-4 rounded-[18px] border border-white/8 bg-black/12 px-4 py-4 text-sm leading-6 text-muted">
            Kod BDP klijenata ovo je jedna centralna lista koju vide i klijent i svi eksperti. Ako vodis Master Mind, akcije su po pravilu vezane za konkretan sastanak.
          </div>
        )}

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-4">
            <p className="text-sm text-muted">Overdue</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{stats.overdue}</p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-4">
            <p className="text-sm text-muted">Deljeno sa klijentom</p>
            <p className="mt-2 text-xl font-semibold text-foreground">{stats.shared}</p>
          </div>
          <div className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-4">
            <p className="text-sm text-muted">Radni fokus</p>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {scope === "shared"
                ? "Jedinstvena lista za ceo klijent account"
                : currentMeeting?.title ?? "Sastanak nije izabran"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className="brand-button-secondary" onClick={addAction}>
            Dodaj task
          </button>
          <button
            type="button"
            className="brand-button disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isPending}
            onClick={handleSave}
          >
            Sacuvaj akcije
          </button>
          {feedback ? <p className="text-sm text-muted">{feedback}</p> : null}
        </div>
      </div>

      <div className="brand-item p-5">
        <p className="text-base font-semibold text-foreground">Uredjivanje taskova</p>
        <div className="mt-4 grid gap-3">
          {currentActions.length ? (
            currentActions.map((action, index) => (
              <div
                key={`${currentKey}-${action.id || index}`}
                className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <StatusChip
                    label={action.done ? "Zavrseno" : "Aktivno"}
                    tone={action.done ? "success" : "neutral"}
                  />
                  <button
                    type="button"
                    className="text-sm font-semibold text-accent underline underline-offset-4"
                    onClick={() => removeAction(index)}
                  >
                    Ukloni task
                  </button>
                </div>

                <div className="mt-4 grid gap-3">
                  <input
                    className="brand-input"
                    value={action.title}
                    onChange={(event) =>
                      updateAction(index, { title: event.target.value })
                    }
                    placeholder="Naziv taska"
                  />
                  <div className="grid gap-3 md:grid-cols-3">
                    <select
                      className="brand-input"
                      value={action.owner}
                      onChange={(event) =>
                        updateAction(index, {
                          owner: event.target.value as MeetingAction["owner"],
                        })
                      }
                    >
                      <option value="Klijent">Klijent</option>
                      <option value="Konsultant">Konsultant</option>
                    </select>

                    <select
                      className="brand-input"
                      value={action.priority ?? "Srednji"}
                      onChange={(event) =>
                        updateAction(index, {
                          priority: event.target.value as NonNullable<
                            MeetingAction["priority"]
                          >,
                        })
                      }
                    >
                      <option value="Nizak">Nizak</option>
                      <option value="Srednji">Srednji</option>
                      <option value="Visok">Visok</option>
                    </select>

                    <input
                      className="brand-input"
                      type="datetime-local"
                      value={toDateTimeLocalValue(action.dueDate)}
                      onChange={(event) =>
                        updateAction(index, {
                          dueDate: toIsoOrFallback(event.target.value, action.dueDate),
                        })
                      }
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-[0.7fr_0.3fr]">
                    <input
                      className="brand-input"
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={action.done ? 100 : action.completionPercent ?? 0}
                      onChange={(event) =>
                        updateAction(index, {
                          completionPercent: Number(event.target.value),
                          done: Number(event.target.value) === 100,
                        })
                      }
                    />
                    <div className="rounded-[16px] border border-white/8 bg-black/12 px-4 py-3 text-center text-sm font-semibold text-foreground">
                      {action.done ? 100 : action.completionPercent ?? 0}%
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="flex items-center gap-3 text-sm text-muted">
                      <input
                        type="checkbox"
                        checked={action.done}
                        onChange={(event) =>
                          updateAction(index, {
                            done: event.target.checked,
                            completionPercent: event.target.checked
                              ? 100
                              : action.completionPercent === 100
                                ? 0
                                : action.completionPercent,
                          })
                        }
                      />
                      Zavrseno
                    </label>
                    <label className="flex items-center gap-3 text-sm text-muted">
                      <input
                        type="checkbox"
                        checked={action.sharedWithClient}
                        onChange={(event) =>
                          updateAction(index, {
                            sharedWithClient: event.target.checked,
                          })
                        }
                      />
                      Vidljivo klijentu
                    </label>
                    <label className="flex items-center gap-3 text-sm text-muted">
                      <input
                        type="checkbox"
                        checked={action.reminderOnCreate}
                        onChange={(event) =>
                          updateAction(index, {
                            reminderOnCreate: event.target.checked,
                          })
                        }
                      />
                      Email na kreiranje
                    </label>
                    <label className="flex items-center gap-3 text-sm text-muted">
                      <input
                        type="checkbox"
                        checked={action.reminderBeforeDue}
                        onChange={(event) =>
                          updateAction(index, {
                            reminderBeforeDue: event.target.checked,
                          })
                        }
                      />
                      Reminder pre roka
                    </label>
                    <label className="flex items-center gap-3 text-sm text-muted md:col-span-2">
                      <input
                        type="checkbox"
                        checked={action.reminderWhenOverdue}
                        onChange={(event) =>
                          updateAction(index, {
                            reminderWhenOverdue: event.target.checked,
                          })
                        }
                      />
                      Reminder kada task predje rok
                    </label>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">
              Za ovaj scope jos nema taskova. Dodaj prvi zadatak i sacuvaj listu.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
