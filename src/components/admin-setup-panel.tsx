"use client";

import { ChangeEvent, useDeferredValue, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  clientIntakeFields,
  programPlaybooks,
  staffIntakeFields,
} from "@/lib/operating-model";
import {
  AutomationDispatchLog,
  AutomationQueueItem,
  BdpImportRow,
  ChipTone,
  Client,
  ImportBlueprint,
  IntegrationBlueprint,
  IntegrationId,
  IntegrationRun,
  IntegrationStatus,
  MeetingTemplate,
  Program,
  ReportTemplate,
  ReminderRule,
  StaffUser,
} from "@/lib/types";
import { ReportTemplateManager } from "@/components/report-template-manager";
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
  integrationRuns: IntegrationRun[];
  automationQueue: AutomationQueueItem[];
  automationHistory: AutomationDispatchLog[];
  reportTemplates: ReportTemplate[];
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

function formatIntegrationStatus(status: IntegrationStatus) {
  if (status === "Connected") {
    return "Povezano";
  }

  if (status === "Planned") {
    return "Delimicno";
  }

  return "Treba setup";
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
  integrationRuns,
  automationQueue,
  automationHistory,
  reportTemplates,
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
  const [syncFeedback, setSyncFeedback] = useState<string>("");
  const [automationFeedback, setAutomationFeedback] = useState<string>("");
  const [importRows, setImportRows] = useState<BdpImportRow[]>([]);
  const [selectedSyncClientId, setSelectedSyncClientId] = useState<string>(
    clients[0]?.id ?? "",
  );
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<IntegrationId>(
    integrations[0]?.id ?? "zoom",
  );
  const deferredImportRows = useDeferredValue(importRows);

  const selectedProgram =
    programs.find((program) => program.id === clientForm.programId) ?? programs[0];
  const managers = staffUsers.filter((staff) => staff.role === "manager");
  const consultants = staffUsers.filter((staff) => staff.role === "consultant");
  const selectedPlaybook = programPlaybooks.find(
    (playbook) => playbook.programId === selectedProgram?.id,
  );
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
  const recentRuns = integrationRuns.slice(0, 8);
  const recentAutomationHistory = automationHistory.slice(0, 8);
  const setupSteps = [
    {
      label: "1. Program",
      title: "Izaberi Master Mind ili BDP",
      text: "Program odredjuje module, tipove sastanaka i tok rada.",
    },
    {
      label: "2. Ljudi",
      title: "Dodeli eksperte",
      text: "Master Mind ima 2 eksperta, BDP ima Operations, Finance i HR.",
    },
    {
      label: "3. Klijent",
      title: "Kreiraj karticu i portal",
      text: "Klijent dobija svoju karticu, Drive hub i prvi meeting cadence.",
    },
    {
      label: "4. Sastanci",
      title: "Popuni vreme, prisustvo i linkove",
      text: "Svaki sastanak cuva start, kraj, kasnjenje, snimke i izvestaj.",
    },
    {
      label: "5. Akcije",
      title: "Vodi jednu action listu",
      text: "Task ima ownera, rok, prioritet, procenat i email podsetnike.",
    },
  ];

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
          `Klijent je dodat. Baza sada ima ${payload.clientCount} klijenata.`,
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
          `Importovan je ${payload.importedRows} red. Baza sada ima ${payload.clientCount} klijenata.`,
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

  function handleIntegrationSync() {
    setSyncFeedback("");
    setPendingAction("import");

    void (async () => {
      try {
        const response = await fetch("/api/admin/integrations/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            integrationId: selectedIntegrationId,
            clientId: selectedSyncClientId || undefined,
          }),
        });

        const payload = await response.json();

        if (!response.ok) {
          setSyncFeedback(payload.error || "Sync nije uspeo.");
          return;
        }

        setSyncFeedback(
          `Sync je evidentiran. Ukupno run-ova u istoriji: ${payload.runCount}.`,
        );
        startTransition(() => {
          router.refresh();
        });
      } catch {
        setSyncFeedback("Doslo je do greske pri sync zahtevu.");
      } finally {
        setPendingAction("");
      }
    })();
  }

  function handleAutomationDispatch(queueItemId: string) {
    setAutomationFeedback("");
    setPendingAction("staff");

    void (async () => {
      try {
        const response = await fetch("/api/admin/automation-dispatch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ queueItemId }),
        });

        const payload = await response.json();

        if (!response.ok) {
          setAutomationFeedback(payload.error || "Slanje automation stavke nije uspelo.");
          return;
        }

        setAutomationFeedback(
          `Automation stavka je obradjena. Istorija sada ima ${payload.historyCount} zapisa.`,
        );
        startTransition(() => {
          router.refresh();
        });
      } catch {
        setAutomationFeedback("Doslo je do greske pri automation slanju.");
      } finally {
        setPendingAction("");
      }
    })();
  }

  return (
    <div className="grid gap-4">
      <div className="brand-item p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-semibold text-foreground">
              Redosled rada u admin delu
            </p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Prvo se postavi program i tim, zatim klijent, sastanci, akcije i integracije.
            </p>
          </div>
          <StatusChip label="Operativni tok" tone="accent" />
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {setupSteps.map((step) => (
            <div
              key={step.label}
              className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-4"
            >
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#ff946d]">
                {step.label}
              </p>
              <p className="mt-2 font-semibold text-foreground">{step.title}</p>
              <p className="mt-2 text-sm leading-6 text-muted">{step.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="brand-kpi">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Admin</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">{actorName}</p>
          <p className="mt-2 text-sm text-muted">Uredjuje setup i import</p>
        </div>
        <div className="brand-kpi">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Integracije</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">
            {connectedIntegrations}/{integrations.length}
          </p>
          <p className="mt-2 text-sm text-muted">Povezano / ukupno</p>
        </div>
        <div className="brand-kpi">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">Korisnici</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">
            {staffUsers.length + clients.length}
          </p>
          <p className="mt-2 text-sm text-muted">
            {staffUsers.length} zaposlenih / {clients.length} klijenata
          </p>
        </div>
        <div className="brand-kpi">
          <p className="text-xs uppercase tracking-[0.16em] text-muted">BDP import</p>
          <p className="mt-3 text-2xl font-semibold text-foreground">
            {deferredImportRows.length}
          </p>
          <p className="mt-2 text-sm text-muted">
            {totalImportedMeetings} sastanaka u preview-u
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="brand-item p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-foreground">
                Integracije
              </p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Status i sledeci korak za Zoom, Thinkific, Drive, izvestaje i email.
              </p>
            </div>
            <StatusChip label={`${connectedIntegrations} povezano`} tone="accent" />
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
                    label={formatIntegrationStatus(integration.status)}
                    tone={toneForIntegration(integration.status)}
                  />
                </div>

                <div className="mt-4 grid gap-3 text-sm text-muted md:grid-cols-2">
                  <div>
                    <p className="font-semibold text-foreground">Prikuplja</p>
                    <div className="mt-2 space-y-2">
                      {integration.pulls.map((item) => (
                        <p key={item}>- {item}</p>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Salje / upisuje</p>
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
                      {integration.connectedKeys.includes(key) ? "povezano" : "ceka"} {key}
                    </span>
                  ))}
                </div>

                <p className="mt-4 text-sm leading-6 text-muted">
                  Sledeci korak: {integration.nextStep}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="brand-item p-5">
            <p className="text-lg font-semibold text-foreground">Pravila pristupa</p>
            <div className="mt-4 grid gap-3 text-sm text-muted">
              <div className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-4">
                <p className="font-semibold text-foreground">Klijent portal</p>
                <p className="mt-2">
                  Klijent vidi samo svoju karticu, svoje sastanke, svoju zajednicku action listu i svoje materijale.
                </p>
              </div>
              <div className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-4">
                <p className="font-semibold text-foreground">Konsultantski prostor</p>
                <p className="mt-2">
                  Konsultant vidi samo module na kojima je dodeljen i unosi sastanke, izvestaje i taskove.
                </p>
              </div>
              <div className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-4">
                <p className="font-semibold text-foreground">Menadzer i admin pristup</p>
                <p className="mt-2">
                  Menadzer prebacuje klijente, a admin pristup otvara setup, integracije, import i prava pristupa.
                </p>
              </div>
            </div>
          </div>

          <div className="brand-item p-5">
            <p className="text-lg font-semibold text-foreground">Email podsetnici</p>
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

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="brand-item p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-foreground">
                Manual sync centar
              </p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Rucno osvezavanje integracija po klijentu, sa jasnim logom sta je uradjeno i sta jos ceka setup.
              </p>
            </div>
            <StatusChip label={`${recentRuns.length} skorasnjih run-ova`} tone="accent" />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <select
              className="brand-input"
              value={selectedIntegrationId}
              onChange={(event) =>
                setSelectedIntegrationId(event.target.value as IntegrationId)
              }
            >
              {integrations.map((integration) => (
                <option key={integration.id} value={integration.id}>
                  {integration.title}
                </option>
              ))}
            </select>
            <select
              className="brand-input"
              value={selectedSyncClientId}
              onChange={(event) => setSelectedSyncClientId(event.target.value)}
            >
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name} / {client.company}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="brand-button disabled:cursor-not-allowed disabled:opacity-70"
              disabled={pendingAction !== ""}
              onClick={handleIntegrationSync}
            >
              Pokreni manual sync
            </button>
            {syncFeedback ? <p className="text-sm text-muted">{syncFeedback}</p> : null}
          </div>

          <div className="mt-4 grid gap-3">
            {recentRuns.length ? (
              recentRuns.map((run) => (
                <div
                  key={run.id}
                  className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {run.integrationId} {run.clientName ? `/ ${run.clientName}` : ""}
                      </p>
                      <p className="mt-1 text-sm text-muted">{run.summary}</p>
                    </div>
                    <StatusChip
                      label={run.status}
                      tone={
                        run.status === "Uspeh"
                          ? "success"
                          : run.status === "Ceka setup"
                            ? "warning"
                            : "danger"
                      }
                    />
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {new Date(run.finishedAt).toLocaleString("sr-RS")}
                  </p>
                  {run.details.length ? (
                    <div className="mt-3 space-y-2 text-sm text-muted">
                      {run.details.map((detail) => (
                        <p key={detail}>- {detail}</p>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">
                Jos nema evidentiranih sync run-ova.
              </p>
            )}
          </div>
        </div>

        <div className="brand-item p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-foreground">
                Reminder i email outbox
              </p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Pending queue pokazuje sta ceka slanje, a istorija cuva sta je vec obradjeno.
              </p>
            </div>
            <StatusChip label={`${automationQueue.length} pending`} tone="accent" />
          </div>

          <div className="mt-4 grid gap-3">
            {automationQueue.length ? (
              automationQueue.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {item.ruleId} / {item.clientName}
                      </p>
                      <p className="mt-1 text-sm text-muted">{item.summary}</p>
                    </div>
                    <StatusChip label={item.trigger} tone="neutral" />
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {item.audience} / zakazano {new Date(item.scheduledFor).toLocaleString("sr-RS")}
                  </p>
                  <div className="mt-3">
                    <button
                      type="button"
                      className="brand-button-secondary disabled:cursor-not-allowed disabled:opacity-70"
                      disabled={pendingAction !== ""}
                      onClick={() => handleAutomationDispatch(item.id)}
                    >
                      Oznaci kao poslato
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted">
                Trenutno nema pending automation stavki.
              </p>
            )}
          </div>

          {automationFeedback ? (
            <p className="mt-4 text-sm text-muted">{automationFeedback}</p>
          ) : null}

          <div className="mt-5 rounded-[18px] border border-white/8 bg-black/12 px-4 py-4">
            <p className="font-semibold text-foreground">Skorasnja istorija</p>
            <div className="mt-3 grid gap-3">
              {recentAutomationHistory.length ? (
                recentAutomationHistory.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-foreground">
                          {item.ruleId} / {item.clientName}
                        </p>
                        <p className="mt-1 text-sm text-muted">{item.summary}</p>
                      </div>
                      <StatusChip
                        label={item.status}
                        tone={
                          item.status === "Poslato"
                            ? "success"
                            : item.status === "Ceka setup"
                              ? "warning"
                              : "danger"
                        }
                      />
                    </div>
                    <p className="mt-2 text-sm text-muted">
                      {item.audience} / {new Date(item.sentAt).toLocaleString("sr-RS")}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">
                  Istorija slanja je trenutno prazna.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <ReportTemplateManager reportTemplates={reportTemplates} />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="brand-item p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-foreground">
                Programski tokovi
              </p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Kratak pregled kako se vode Master Mind i BDP.
              </p>
            </div>
            <StatusChip
              label={selectedPlaybook?.title ?? "Program"}
              tone="accent"
            />
          </div>

          <div className="mt-4 grid gap-4">
            {programPlaybooks.map((playbook) => (
              <div
                key={playbook.programId}
                className="rounded-[20px] border border-white/8 bg-white/4 px-4 py-4"
              >
                <p className="font-semibold text-foreground">{playbook.title}</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {playbook.deliveryModel}
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {playbook.meetingFlow.map((step) => (
                    <div
                      key={step.id}
                      className="rounded-[18px] border border-white/8 bg-black/10 px-4 py-3"
                    >
                      <p className="font-semibold text-foreground">{step.title}</p>
                      <p className="mt-1 text-sm text-muted">
                        {step.timing} / {step.owner}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        {step.description}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="mt-4 grid gap-3 text-sm text-muted md:grid-cols-2">
                  <div>
                    <p className="font-semibold text-foreground">Odgovornosti</p>
                    <div className="mt-2 space-y-2">
                      {playbook.staffResponsibilities.map((item) => (
                        <p key={item}>- {item}</p>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Admin koraci</p>
                    <div className="mt-2 space-y-2">
                      {playbook.adminChecklist.map((item) => (
                        <p key={item}>- {item}</p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="brand-item p-5">
            <p className="text-lg font-semibold text-foreground">
              Obavezno po sastanku
            </p>
            <div className="mt-4 grid gap-3">
              {(selectedPlaybook?.meetingCapture ?? []).map((item) => (
                <div
                  key={item.id}
                  className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-foreground">{item.title}</p>
                    <StatusChip label={item.audience} tone="neutral" />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="brand-item p-5">
            <p className="text-lg font-semibold text-foreground">
              Obavezni podaci za unos
            </p>
            <div className="mt-4 grid gap-4">
              <div>
                <p className="font-semibold text-foreground">Novi klijent</p>
                <div className="mt-3 grid gap-3">
                  {clientIntakeFields.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-semibold text-foreground">{item.label}</p>
                        <StatusChip
                          label={item.required ? "Obavezno" : "Opcionalno"}
                          tone={item.required ? "warning" : "neutral"}
                        />
                      </div>
                      <p className="mt-1 text-sm text-muted">{item.owner}</p>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <p className="font-semibold text-foreground">Novi zaposleni</p>
                <div className="mt-3 grid gap-3">
                  {staffIntakeFields.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-semibold text-foreground">{item.label}</p>
                        <StatusChip
                          label={item.required ? "Obavezno" : "Opcionalno"}
                          tone={item.required ? "warning" : "neutral"}
                        />
                      </div>
                      <p className="mt-1 text-sm text-muted">{item.owner}</p>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        {item.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="brand-item p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-foreground">Novi klijent</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Kreira karticu, portal, eksperte i pocetne sastanke.
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

          {selectedPlaybook ? (
            <div className="mt-5 rounded-[20px] border border-white/8 bg-black/12 px-4 py-4 text-sm text-muted">
              <p className="font-semibold text-foreground">Sta ce sistem uraditi posle kreiranja</p>
              <div className="mt-3 space-y-2">
                {selectedPlaybook.adminChecklist.map((item) => (
                  <p key={item}>- {item}</p>
                ))}
              </div>
            </div>
          ) : null}

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
              <p className="text-lg font-semibold text-foreground">Novi zaposleni</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Dodaje konsultanta ili managera u tim, discipline i prava pristupa.
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
              placeholder="Pozicija"
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
              placeholder="Tim"
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

          <div className="mt-5 rounded-[20px] border border-white/8 bg-black/12 px-4 py-4 text-sm text-muted">
            <p className="font-semibold text-foreground">Discipline</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                "Profitability Consultant",
                "Organization Consultant",
                "Fractional Operations Manager",
                "Finance Director",
                "HR Fractional Director",
                "Client Success Manager",
              ].map((item) => (
                <span key={item} className="brand-pill">
                  {item}
                </span>
              ))}
            </div>
          </div>

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
              <p className="text-lg font-semibold text-foreground">BDP import iz Excela</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Uvezi klijente i 4 BDP termina: 3:1, Operations, Finance i HR.
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
                      label={`${Number(Boolean(row.monthlyKickoffAt)) + Number(Boolean(row.operationsAt)) + Number(Boolean(row.financeAt)) + Number(Boolean(row.hrLeadershipAt))} sastanka`}
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
            <p className="text-lg font-semibold text-foreground">Kolone za import</p>
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
            <p className="text-lg font-semibold text-foreground">Tipovi sastanaka</p>
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
