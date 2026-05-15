"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StatusChip } from "@/components/status-chip";
import {
  Client,
  ClientAssignment,
  ClientDataSource,
  StaffUser,
} from "@/lib/types";

type ClientOperationsPanelProps = {
  client: Client;
  staffUsers: StaffUser[];
};

function buildAssignmentsState(client: Client) {
  return client.assignments.map((assignment) => ({ ...assignment }));
}

function buildDataSourcesState(client: Client) {
  return client.dataSources.map((source) => ({ ...source, metrics: [...source.metrics] }));
}

export function ClientOperationsPanel({
  client,
  staffUsers,
}: ClientOperationsPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [assignments, setAssignments] = useState<ClientAssignment[]>(() =>
    buildAssignmentsState(client),
  );
  const [dataSources, setDataSources] = useState<ClientDataSource[]>(() =>
    buildDataSourcesState(client),
  );
  const [noteTitle, setNoteTitle] = useState("");
  const [noteDetails, setNoteDetails] = useState("");
  const [noteOwner, setNoteOwner] = useState("Customer Service");
  const [assignmentFeedback, setAssignmentFeedback] = useState("");
  const [sourceFeedback, setSourceFeedback] = useState("");
  const consultants = staffUsers.filter((staff) => staff.role === "consultant");

  function updateAssignment(index: number, patch: Partial<ClientAssignment>) {
    setAssignments((current) =>
      current.map((assignment, itemIndex) =>
        itemIndex === index ? { ...assignment, ...patch } : assignment,
      ),
    );
  }

  function addSupportAssignment() {
    setAssignments((current) => [
      ...current,
      {
        module: client.programModules[0] ?? "Operations",
        consultantId: consultants[0]?.id ?? "",
        specialty: consultants[0]?.title ?? "Consultant",
        responsibility: "Support",
      },
    ]);
  }

  function removeAssignment(index: number) {
    setAssignments((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  async function handleSaveAssignments() {
    setAssignmentFeedback("");
    const response = await fetch("/api/client-operations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "updateAssignments",
        clientId: client.id,
        assignments,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      setAssignmentFeedback(payload.error || "Nije uspelo cuvanje dodela.");
      return;
    }

    setAssignmentFeedback("Dodele eksperata su sacuvane.");
    startTransition(() => {
      router.refresh();
    });
  }

  async function handleSaveSources() {
    setSourceFeedback("");
    const response = await fetch("/api/client-operations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "updateDataSources",
        clientId: client.id,
        dataSources,
        noteTitle,
        noteDetails,
        noteOwner,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      setSourceFeedback(payload.error || "Nije uspelo cuvanje izvora i CS napomena.");
      return;
    }

    setSourceFeedback("Izvori i customer service napomene su sacuvani.");
    setNoteTitle("");
    setNoteDetails("");
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="brand-item p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-foreground">Dodela i zamena eksperata</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Ovde menjas lead eksperta, dodajes support eksperta i odrzavas vise odgovornih ljudi na jednom klijentu.
            </p>
          </div>
          <StatusChip label={`${assignments.length} dodela`} tone="accent" />
        </div>

        <div className="mt-4 grid gap-3">
          {assignments.map((assignment, index) => {
            const selectedConsultant =
              consultants.find((staff) => staff.id === assignment.consultantId) ??
              consultants[0];

            return (
              <div
                key={`${assignment.module}-${index}`}
                className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-4"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">
                    {assignment.responsibility ?? "Lead"} / {assignment.module}
                  </p>
                  {assignment.responsibility === "Support" ? (
                    <button
                      type="button"
                      className="text-sm font-semibold text-accent underline underline-offset-4"
                      onClick={() => removeAssignment(index)}
                    >
                      Ukloni support
                    </button>
                  ) : null}
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <select
                    className="brand-input"
                    value={assignment.module}
                    onChange={(event) =>
                      updateAssignment(index, { module: event.target.value })
                    }
                  >
                    {client.programModules.map((module) => (
                      <option key={module} value={module}>
                        {module}
                      </option>
                    ))}
                  </select>

                  <select
                    className="brand-input"
                    value={assignment.consultantId}
                    onChange={(event) => {
                      const consultant =
                        consultants.find((staff) => staff.id === event.target.value) ??
                        selectedConsultant;
                      updateAssignment(index, {
                        consultantId: event.target.value,
                        specialty: consultant?.title ?? assignment.specialty,
                      });
                    }}
                  >
                    {consultants.map((consultant) => (
                      <option key={consultant.id} value={consultant.id}>
                        {consultant.name} / {consultant.title}
                      </option>
                    ))}
                  </select>

                  <select
                    className="brand-input"
                    value={assignment.responsibility ?? "Lead"}
                    onChange={(event) =>
                      updateAssignment(index, {
                        responsibility: event.target.value as "Lead" | "Support",
                      })
                    }
                  >
                    <option value="Lead">Lead</option>
                    <option value="Support">Support</option>
                  </select>
                </div>
                <p className="mt-3 text-sm text-muted">
                  {selectedConsultant?.focus ?? "Opis eksperta nije dodat."}
                </p>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className="brand-button-secondary" onClick={addSupportAssignment}>
            Dodaj support eksperta
          </button>
          <button
            type="button"
            className="brand-button disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isPending}
            onClick={handleSaveAssignments}
          >
            Sacuvaj dodele
          </button>
          {assignmentFeedback ? (
            <p className="text-sm text-muted">{assignmentFeedback}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4">
        <div className="brand-item p-5">
          <p className="text-base font-semibold text-foreground">Povezani izvori profila</p>
          <div className="mt-4 grid gap-3">
            {dataSources.map((source, index) => (
              <div
                key={source.id}
                className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-foreground">{source.label}</p>
                  <StatusChip label={source.status} tone="neutral" />
                </div>
                {source.metrics.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {source.metrics.map((metric) => (
                      <span key={`${source.id}-${metric}`} className="brand-pill">
                        {metric}
                      </span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3 grid gap-3">
                  <select
                    className="brand-input"
                    value={source.status}
                    onChange={(event) =>
                      setDataSources((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                status: event.target.value as ClientDataSource["status"],
                              }
                            : item,
                        ),
                      )
                    }
                  >
                    <option value="Povezano">Povezano</option>
                    <option value="Rucno">Rucno</option>
                    <option value="Ceka sync">Ceka sync</option>
                  </select>
                  <input
                    className="brand-input"
                    placeholder="External ID / link"
                    value={source.externalId}
                    onChange={(event) =>
                      setDataSources((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, externalId: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                  <input
                    className="brand-input"
                    placeholder="Vlasnik izvora"
                    value={source.owner}
                    onChange={(event) =>
                      setDataSources((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, owner: event.target.value } : item,
                        ),
                      )
                    }
                  />
                  <textarea
                    className="brand-input min-h-[90px] resize-y"
                    placeholder="Sta ovaj izvor donosi u rad sa klijentom..."
                    value={source.summary}
                    onChange={(event) =>
                      setDataSources((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, summary: event.target.value } : item,
                        ),
                      )
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="brand-item p-5">
          <p className="text-base font-semibold text-foreground">Customer Service napomena</p>
          <div className="mt-4 grid gap-3">
            <input
              className="brand-input"
              placeholder="Naslov napomene"
              value={noteTitle}
              onChange={(event) => setNoteTitle(event.target.value)}
            />
            <input
              className="brand-input"
              placeholder="Vlasnik napomene"
              value={noteOwner}
              onChange={(event) => setNoteOwner(event.target.value)}
            />
            <textarea
              className="brand-input min-h-[120px] resize-y"
              placeholder="Sta customer service treba da doda o klijentu..."
              value={noteDetails}
              onChange={(event) => setNoteDetails(event.target.value)}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="brand-button disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isPending}
              onClick={handleSaveSources}
            >
              Sacuvaj izvore i napomene
            </button>
            {sourceFeedback ? <p className="text-sm text-muted">{sourceFeedback}</p> : null}
          </div>

          {client.customerServiceNotes.length ? (
            <div className="mt-4 space-y-3">
              {client.customerServiceNotes.slice(0, 4).map((note) => (
                <div
                  key={note.id}
                  className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-4"
                >
                  <p className="font-semibold text-foreground">{note.title}</p>
                  <p className="mt-1 text-sm text-muted">
                    {note.owner} / {new Date(note.updatedAt).toLocaleString("sr-RS")}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted">{note.details}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
