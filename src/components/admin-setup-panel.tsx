"use client";

import { ChangeEvent, useDeferredValue, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  BdpImportRow,
  ChipTone,
  Client,
  ImportBlueprint,
  IntegrationBlueprint,
  IntegrationStatus,
  MeetingTemplate,
  Program,
  ReminderRule,
  StaffUser,
} from "@/lib/types";
import { StatusChip } from "@/components/status-chip";

type IntegrationState = IntegrationBlueprint & {
  status: IntegrationStatus;
  connectedKeys: string[];
};

type AdminSetupPanelProps = {
  actorName: string;
  clients: Client[];
  staffUsers: StaffUser[];
  programs: Program[];
  integrations: IntegrationState[];
  meetingTemplates: MeetingTemplate[];
  reminderRules: ReminderRule[];
  importBlueprints: ImportBlueprint[];
};

type ClientFormState = {
  name: string;
  company: string;
  email: string;
  phone: string;
  city: string;
  programId: string;
  managerId: string;
  assignments: Record<string, string>;
};

type StaffFormState = {
  name: string;
  email: string;
  title: string;
  role: "consultant" | "manager";
  adminAddon: boolean;
  team: string;
  focus: string;
  specialties: string;
};

function toneForIntegration(status: IntegrationStatus): ChipTone {
  if (status === "Connected") {
    return "success";
  }
  if (status === "Needs setup") {
    return "warning";
  }
  return "info";
}

function normalizeLabel(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function serializeCellValue(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "number") {
    return String(value);
  }

  return String(value ?? "").trim();
}

function findValue(
  row: Record<string, unknown>,
  aliases: string[],
) {
  const normalizedEntries = Object.entries(row).map(([key, value]) => [
    normalizeLabel(key),
    serializeCellValue(value),
  ]);

  for (const alias of aliases) {
    const normalizedAlias = normalizeLabel(alias);
    const matched = normalizedEntries.find(([key]) => key === normalizedAlias);
    if (matched?.[1]) {
      return matched[1];
    }
  }

  return "";
}

function detectRows(rows: Record<string, unknown>[]) {
  return rows
    .map((row) => ({
      clientName: findValue(row, [
        "Client Name",
        "Client",
        "Klijent",
        "Ime klijenta",
      ]),
      company: findValue(row, ["Company", "Company Name", "Firma", "Kompanija"]),
      email: findValue(row, ["Email", "Client Email", "Mail"]),
      city: findValue(row, ["City", "Grad"]),
      monthlyKickoffAt: findValue(row, [
        "3:1 Monthly Operations / Finance / Leadership & HR Meeting",
        "3:1 Monthly Meeting",
        "3:1",
        "Monthly kickoff",
      ]),
      operationsAt: findValue(row, [
        "1:1 Monthly Operations Meeting",
        "Operations Meeting",
        "Operations",
      ]),
      financeAt: findValue(row, [
        "1:1 Monthly Finance Meeting",
        "Finance Meeting",
        "Finance",
      ]),
      hrLeadershipAt: findValue(row, [
        "1:1 Monthly Leadership & HR Meeting",
        "Leadership & HR Meeting",
        "HR & Leadership",
        "HR",
      ]),
    }))
    .filter((row) => row.clientName);
}

function pickDefaultConsultant(staffUsers: StaffUser[], module: string) {
  const specialtyMatchers: Record<string, string[]> = {
    Profitabilnost: ["Profitability", "Finance"],
    Organizacija: ["Organization", "Operations"],
    Operations: ["Operations", "Organization"],
    Finance: ["Finance", "Profitability"],
    "HR & Leadership": ["HR & Leadership", "HR"],
  };

  return (
    staffUsers.find(
      (staff) =>
        staff.role === "consultant" &&
        specialtyMatchers[module]?.some((matcher) =>
          staff.specialties.includes(matcher),
        ),
    )?.id ??
    staffUsers.find((staff) => staff.role === "consultant")?.id ??
    ""
  );
}

function buildInitialClientState(
  programs: Program[],
  staffUsers: StaffUser[],
): ClientFormState {
  const initialProgram = programs[0];
  const initialAssignments = Object.fromEntries(
    (initialProgram?.modules ?? []).map((module) => [
      module,
      pickDefaultConsultant(staffUsers, module),
    ]),
  );

  return {
    name: "",
    company: "",
    email: "",
    phone: "",
    city: "Beograd",
    programId: initialProgram?.id ?? "",
    managerId: staffUsers.find((staff) => staff.role === "manager")?.id ?? "",
    assignments: initialAssignments,
  };
}

function buildInitialStaffState(): StaffFormState {
  return {
    name: "",
    email: "",
    title: "",
    role: "consultant",
    adminAddon: false,
    team: "Consulting",
    focus: "",
    specialties: "",
  };
}

export function AdminSetupPanel({
  actorName,
  clients,
  staffUsers,
  programs,
  integrations,
  meetingTemplates,
  reminderRules,
  importBlueprints,
}: AdminSetupPanelProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pendingAction, setPendingAction] = useState<"" | "client" | "staff" | "import">("");
  const [clientForm, setClientForm] = useState<ClientFormState>(() =>
    buildInitialClientState(programs, staffUsers),
  );
  const [staffForm, setStaffForm] = useState<StaffFormState>(buildInitialStaffState);
  const [clientFeedback, setClientFeedback] = useState<string>("");
  const [staffFeedback, setStaffFeedback] = useState<string>("");
  const [importFeedback, setImportFeedback] = useState<string>("");
  const [importRows, setImportRows] = useState<BdpImportRow[]>([]);
  const deferredImportRows = useDeferredValue(importRows);

  const selectedProgram =
    programs.find((program) => program.id === clientForm.programId) ?? programs[0];
  const managers = staffUsers.filter((staff) => staff.role === "manager");
  const consultants = staffUsers.filter((staff) => staff.role === "consultant");
  const connectedIntegrations = integrations.filter(
    (integration) => integration.status === "Connected",
  ).length;
  const totalImportedMeetings = deferredImportRows.reduce(
    (sum, row) =>
      sum +
      Number(Boolean(row.monthlyKickoffAt)) +
      Number(Boolean(row.operationsAt)) +
      Number(Boolean(row.financeAt)) +
      Number(Boolean(row.hrLeadershipAt)),
    0,
  );

  function handleProgramChange(programId: string) {
    const nextProgram = programs.find((program) => program.id === programId);
    const nextAssignments = Object.fromEntries(
      (nextProgram?.modules ?? []).map((module) => [
        module,
        clientForm.assignments[module] || pickDefaultConsultant(staffUsers, module),
      ]),
    );

    setClientForm((current) => ({
      ...current,
      programId,
      assignments: nextAssignments,
    }));
  }

  function handleClientSubmit() {
    setClientFeedback("");
    setPendingAction("client");

    void (async () => {
      try {
        const response = await fetch("/api/admin/clients", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...clientForm,
            assignments: (selectedProgram?.modules ?? []).map((module) => ({
              module,
              consultantId: clientForm.assignments[module],
            })),
          }),
        });

        const payload = await response.json();

        if (!response.ok) {
          setClientFeedback(payload.error || "Nismo uspeli da dodamo klijenta.");
          return;
        }

        setClientFeedback(
          `Klijent je dodat. CRM sada ima ${payload.clientCount} klijenata.`,
        );
        setClientForm(buildInitialClientState(programs, staffUsers));
        startTransition(() => {
          router.refresh();
        });
      } catch {
        setClientFeedback("Doslo je do greske pri slanju zahteva.");
      } finally {
        setPendingAction("");
      }
    })();
  }

  function handleStaffSubmit() {
    setStaffFeedback("");
    setPendingAction("staff");

    void (async () => {
      try {
        const response = await fetch("/api/admin/staff", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...staffForm,
            specialties: staffForm.specialties
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          }),
        });

        const payload = await response.json();

        if (!response.ok) {
          setStaffFeedback(payload.error || "Nismo uspeli da dodamo zaposlenog.");
          return;
        }

        setStaffFeedback(
          `Zaposleni je dodat. Ukupno zaposlenih: ${payload.staffCount}.`,
        );
        setStaffForm(buildInitialStaffState());
        startTransition(() => {
          router.refresh();
        });
      } catch {
        setStaffFeedback("Doslo je do greske pri slanju zahteva.");
      } finally {
        setPendingAction("");
      }
    })();
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, {
      type: "array",
      cellDates: true,
    });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
    });

    const normalizedRows = detectRows(rawRows);
    setImportRows(normalizedRows);
    setImportFeedback(
      `Ucitan je ${file.name}. Detektovano redova: ${normalizedRows.length}.`,
    );
  }

  function handleImportSubmit() {
    if (!importRows.length) {
      setImportFeedback("Prvo ucitaj Excel ili CSV fajl.");
      return;
    }

    setImportFeedback("");
    setPendingAction("import");

    void (async () => {
      try {
        const response = await fetch("/api/admin/import-bdp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ rows: importRows }),
        });

        const payload = await response.json();

        if (!response.ok) {
          setImportFeedback(payload.error || "Import nije uspeo.");
          return;
        }

        setImportFeedback(
          `Importovan je ${payload.importedRows} red. CRM sada ima ${payload.clientCount} klijenata.`,
        );
        setImportRows([]);
        startTransition(() => {
          router.refresh();
        });
      } catch {
        setImportFeedback("Doslo je do greske pri importu fajla.");
      } finally {
        setPendingAction("");
      }
    })();
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="brand-kpi">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Admin owner</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">{actorName}</p>
          <p className="mt-2 text-sm text-muted">Centralni setup za ljude, programe i konektore</p>
        </div>
        <div className="brand-kpi">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Integracije</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">
            {connectedIntegrations}/{integrations.length}
          </p>
          <p className="mt-2 text-sm text-muted">Konektora spremnih ili vec povezanih</p>
        </div>
        <div className="brand-kpi">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Ljudi + klijenti</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">
            {staffUsers.length + clients.length}
          </p>
          <p className="mt-2 text-sm text-muted">
            {staffUsers.length} zaposlenih / {clients.length} klijenata
          </p>
        </div>
        <div className="brand-kpi">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Import preview</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">
            {deferredImportRows.length}
          </p>
          <p className="mt-2 text-sm text-muted">
            {totalImportedMeetings} sastanaka detektovano iz BDP batch-a
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="brand-item p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-foreground">
                Integration control center
              </p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Zoom, Thinkific, Drive, AI i email sada imaju jasan setup status i sledeci korak.
              </p>
            </div>
            <StatusChip label={`${connectedIntegrations} connected`} tone="accent" />
          </div>

          <div className="mt-4 grid gap-3">
            {integrations.map((integration) => (
              <div key={integration.id} className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold text-foreground">{integration.title}</p>
                    <p className="text-sm text-muted">
                      {integration.category} / {integration.description}
                    </p>
                  </div>
                  <StatusChip
                    label={integration.status}
                    tone={toneForIntegration(integration.status)}
                  />
                </div>

                <div className="mt-4 grid gap-3 text-sm text-muted md:grid-cols-2">
                  <div>
                    <p className="font-semibold text-foreground">Pulls</p>
                    <div className="mt-2 space-y-2">
                      {integration.pulls.map((item) => (
                        <p key={item}>- {item}</p>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Pushes</p>
                    <div className="mt-2 space-y-2">
                      {integration.pushes.map((item) => (
                        <p key={item}>- {item}</p>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {integration.envKeys.map((key) => (
                    <span key={key} className="brand-pill">
                      {integration.connectedKeys.includes(key) ? "set" : "todo"} {key}
                    </span>
                  ))}
                </div>

                <p className="mt-4 text-sm leading-6 text-muted">
                  Sledece: {integration.nextStep}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="brand-item p-5">
            <p className="text-lg font-semibold text-foreground">Portal i access pravila</p>
            <div className="mt-4 grid gap-3 text-sm text-muted">
              <div className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-4">
                <p className="font-semibold text-foreground">Klijent portal</p>
                <p className="mt-2">
                  Klijent vidi samo svoju karticu, svoje sastanke, svoj shared action board i svoje materijale.
                </p>
              </div>
              <div className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-4">
                <p className="font-semibold text-foreground">Consultant workspace</p>
                <p className="mt-2">
                  Consultant vidi samo module na kojima je dodeljen i unosi sastanke, summary-je i taskove.
                </p>
              </div>
              <div className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-4">
                <p className="font-semibold text-foreground">Manager + admin</p>
                <p className="mt-2">
                  Manager prebacuje klijente, admin add-on otvara setup, integracije, import i permission layer.
                </p>
              </div>
            </div>
          </div>

          <div className="brand-item p-5">
            <p className="text-lg font-semibold text-foreground">Reminder playbook</p>
            <div className="mt-4 grid gap-3">
              {reminderRules.map((rule) => (
                <div key={rule.id} className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-foreground">{rule.label}</p>
                    <StatusChip label={rule.trigger} tone="neutral" />
                  </div>
                  <p className="mt-2 text-sm text-muted">{rule.audience}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{rule.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="brand-item p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-foreground">Dodaj novog klijenta</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Admin setup odmah kreira CRM karticu, portal pristup i pocetni meeting cadence po programu.
              </p>
            </div>
            <StatusChip label={selectedProgram?.name ?? "Program"} tone="accent" />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              className="brand-input"
              placeholder="Ime i prezime"
              value={clientForm.name}
              onChange={(event) =>
                setClientForm((current) => ({ ...current, name: event.target.value }))
              }
            />
            <input
              className="brand-input"
              placeholder="Kompanija"
              value={clientForm.company}
              onChange={(event) =>
                setClientForm((current) => ({ ...current, company: event.target.value }))
              }
            />
            <input
              className="brand-input"
              placeholder="Email"
              value={clientForm.email}
              onChange={(event) =>
                setClientForm((current) => ({ ...current, email: event.target.value }))
              }
            />
            <input
              className="brand-input"
              placeholder="Telefon"
              value={clientForm.phone}
              onChange={(event) =>
                setClientForm((current) => ({ ...current, phone: event.target.value }))
              }
            />
            <input
              className="brand-input"
              placeholder="Grad"
              value={clientForm.city}
              onChange={(event) =>
                setClientForm((current) => ({ ...current, city: event.target.value }))
              }
            />
            <select
              className="brand-input"
              value={clientForm.programId}
              onChange={(event) => handleProgramChange(event.target.value)}
            >
              {programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name}
                </option>
              ))}
            </select>
            <div className="md:col-span-2">
              <select
                className="brand-input"
                value={clientForm.managerId}
                onChange={(event) =>
                  setClientForm((current) => ({
                    ...current,
                    managerId: event.target.value,
                  }))
                }
              >
                {managers.map((manager) => (
                  <option key={manager.id} value={manager.id}>
                    {manager.name} / {manager.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-5 grid gap-3">
            {selectedProgram?.modules.map((module) => (
              <div key={module} className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-4">
                <p className="text-sm font-semibold text-foreground">{module}</p>
                <select
                  className="brand-input mt-3"
                  value={clientForm.assignments[module] ?? ""}
                  onChange={(event) =>
                    setClientForm((current) => ({
                      ...current,
                      assignments: {
                        ...current.assignments,
                        [module]: event.target.value,
                      },
                    }))
                  }
                >
                  {consultants.map((consultant) => (
                    <option key={consultant.id} value={consultant.id}>
                      {consultant.name} / {consultant.specialties.join(", ")}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              className="brand-button disabled:cursor-not-allowed disabled:opacity-70"
              type="button"
              onClick={handleClientSubmit}
              disabled={Boolean(pendingAction)}
            >
              {pendingAction === "client" ? "Dodavanje..." : "Dodaj klijenta"}
            </button>
            {clientFeedback ? (
              <p className="text-sm text-muted">{clientFeedback}</p>
            ) : null}
          </div>
        </div>

        <div className="brand-item p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-foreground">Dodaj zaposlenog</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Novi consultant ili manager odmah ulazi u role model, team i admin add-on setup.
              </p>
            </div>
            <StatusChip label={staffForm.role} tone="warning" />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              className="brand-input"
              placeholder="Ime i prezime"
              value={staffForm.name}
              onChange={(event) =>
                setStaffForm((current) => ({ ...current, name: event.target.value }))
              }
            />
            <input
              className="brand-input"
              placeholder="Email"
              value={staffForm.email}
              onChange={(event) =>
                setStaffForm((current) => ({ ...current, email: event.target.value }))
              }
            />
            <input
              className="brand-input"
              placeholder="Title"
              value={staffForm.title}
              onChange={(event) =>
                setStaffForm((current) => ({ ...current, title: event.target.value }))
              }
            />
            <select
              className="brand-input"
              value={staffForm.role}
              onChange={(event) =>
                setStaffForm((current) => ({
                  ...current,
                  role: event.target.value as "consultant" | "manager",
                }))
              }
            >
              <option value="consultant">consultant</option>
              <option value="manager">manager</option>
            </select>
            <input
              className="brand-input"
              placeholder="Team"
              value={staffForm.team}
              onChange={(event) =>
                setStaffForm((current) => ({ ...current, team: event.target.value }))
              }
            />
            <input
              className="brand-input"
              placeholder="Specijalnosti, odvojene zarezom"
              value={staffForm.specialties}
              onChange={(event) =>
                setStaffForm((current) => ({
                  ...current,
                  specialties: event.target.value,
                }))
              }
            />
            <div className="md:col-span-2">
              <input
                className="brand-input"
                placeholder="Fokus / opis rada"
                value={staffForm.focus}
                onChange={(event) =>
                  setStaffForm((current) => ({ ...current, focus: event.target.value }))
                }
              />
            </div>
          </div>

          <label className="mt-5 flex items-center gap-3 text-sm text-muted">
            <input
              type="checkbox"
              checked={staffForm.adminAddon}
              onChange={(event) =>
                setStaffForm((current) => ({
                  ...current,
                  adminAddon: event.target.checked,
                }))
              }
            />
            Ukljuci admin add-on
          </label>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              className="brand-button disabled:cursor-not-allowed disabled:opacity-70"
              type="button"
              onClick={handleStaffSubmit}
              disabled={Boolean(pendingAction)}
            >
              {pendingAction === "staff" ? "Dodavanje..." : "Dodaj zaposlenog"}
            </button>
            {staffFeedback ? (
              <p className="text-sm text-muted">{staffFeedback}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="brand-item p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-foreground">BDP bulk import centar</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Uvezi Excel/CSV sa terminima i klijentima, pa automatski kreiraj BDP klijente i 4 tipa sastanaka.
              </p>
            </div>
            <StatusChip label={`${deferredImportRows.length} redova`} tone="accent" />
          </div>

          <div className="mt-4 rounded-[18px] border border-dashed border-white/14 bg-white/3 px-4 py-5">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportFile}
            />
            <p className="mt-3 text-sm text-muted">
              Prihvatamo .xlsx, .xls i .csv. Prvi sheet se koristi kao import izvor.
            </p>
          </div>

          {importFeedback ? (
            <p className="mt-4 text-sm text-muted">{importFeedback}</p>
          ) : null}

          <div className="mt-5 grid gap-3">
            {deferredImportRows.length ? (
              deferredImportRows.slice(0, 6).map((row) => (
                <div key={`${row.clientName}-${row.company}`} className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{row.clientName}</p>
                      <p className="text-sm text-muted">
                        {row.company || "Bez kompanije"} / {row.email || "bez email-a"}
                      </p>
                    </div>
                    <StatusChip
                      label={`${Number(Boolean(row.monthlyKickoffAt)) + Number(Boolean(row.operationsAt)) + Number(Boolean(row.financeAt)) + Number(Boolean(row.hrLeadershipAt))} meetinga`}
                      tone="info"
                    />
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-muted md:grid-cols-2">
                    <p>3:1 kickoff: {row.monthlyKickoffAt || "nije uneto"}</p>
                    <p>Operations: {row.operationsAt || "nije uneto"}</p>
                    <p>Finance: {row.financeAt || "nije uneto"}</p>
                    <p>Leadership & HR: {row.hrLeadershipAt || "nije uneto"}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">
                Uploaduj fajl da bi video preview redova i zakazanih BDP sastanaka.
              </p>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              className="brand-button disabled:cursor-not-allowed disabled:opacity-70"
              type="button"
              onClick={handleImportSubmit}
              disabled={Boolean(pendingAction)}
            >
              {pendingAction === "import" ? "Importovanje..." : "Importuj BDP batch"}
            </button>
            <p className="text-sm text-muted">
              Ako klijent ne postoji, sistem ce ga kreirati i otvoriti portal pristup.
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="brand-item p-5">
            <p className="text-lg font-semibold text-foreground">Import template</p>
            <div className="mt-4 grid gap-3">
              {importBlueprints.map((item) => (
                <div key={item.id} className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-4">
                  <p className="font-semibold text-foreground">{item.title}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.formats.map((format) => (
                      <span key={format} className="brand-pill">
                        {format}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-muted">
                    {item.columns.map((column) => (
                      <p key={column}>- {column}</p>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-muted">
                    {item.notes.map((note) => (
                      <p key={note}>- {note}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="brand-item p-5">
            <p className="text-lg font-semibold text-foreground">Meeting template biblioteka</p>
            <div className="mt-4 grid gap-3">
              {meetingTemplates.map((template) => (
                <div key={template.id} className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{template.title}</p>
                      <p className="text-sm text-muted">
                        {template.type} / {template.timingWindow}
                      </p>
                    </div>
                    <StatusChip
                      label={`${template.durationMinutes} min`}
                      tone="neutral"
                    />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {template.modules.map((module) => (
                      <span key={module} className="brand-pill">
                        {module}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 space-y-2 text-sm text-muted">
                    {template.notes.map((note) => (
                      <p key={note}>- {note}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
