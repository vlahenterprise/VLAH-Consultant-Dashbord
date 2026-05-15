import { cache } from "react";
import { hasDatabase, sql } from "@/lib/db";
import {
  automationDispatchLog as seedAutomationDispatchLog,
  clientPortalUsers as seedClientPortalUsers,
  clients as seedClients,
  integrationRuns as seedIntegrationRuns,
  programs as seedPrograms,
  reportTemplates as seedReportTemplates,
  staffUsers as seedStaffUsers,
  transferSuggestions as seedTransferSuggestions,
} from "@/lib/mock-data";
import {
  buildDefaultClientDataSources,
  buildDefaultCustomerServiceNotes,
} from "@/lib/operations-defaults";
import {
  AppData,
  AutomationDispatchLog,
  Client,
  ClientDataSource,
  CustomerServiceNote,
  IntegrationRun,
  Meeting,
  NavigationItem,
  ReportTemplate,
  StaffUser,
  WorkspaceActor,
} from "@/lib/types";

const SNAPSHOT_KEY = "primary";

function createSeedAppData(): AppData {
  return structuredClone({
    programs: seedPrograms,
    staffUsers: seedStaffUsers,
    clients: seedClients,
    clientPortalUsers: seedClientPortalUsers,
    transferSuggestions: seedTransferSuggestions,
    reportTemplates: seedReportTemplates,
    integrationRuns: seedIntegrationRuns,
    automationDispatchLog: seedAutomationDispatchLog,
  });
}

function normalizeDataSource(
  source: Partial<ClientDataSource> | undefined,
  fallback: ClientDataSource,
): ClientDataSource {
  return {
    ...fallback,
    ...source,
    metrics: Array.isArray(source?.metrics) ? source.metrics : fallback.metrics,
  };
}

function normalizeMeeting(meeting: Partial<Meeting>): Meeting {
  return {
    id: meeting.id ?? "",
    title: meeting.title ?? "",
    date: meeting.date ?? meeting.scheduledStartAt ?? new Date().toISOString(),
    scheduledStartAt: meeting.scheduledStartAt ?? new Date().toISOString(),
    actualStartAt: meeting.actualStartAt ?? meeting.scheduledStartAt ?? new Date().toISOString(),
    endedAt: meeting.endedAt ?? meeting.scheduledStartAt ?? new Date().toISOString(),
    durationMinutes: meeting.durationMinutes ?? 60,
    type: meeting.type ?? "Zoom",
    modules: Array.isArray(meeting.modules) ? meeting.modules : [],
    participants: Array.isArray(meeting.participants) ? meeting.participants : [],
    status: meeting.status ?? "Zakazan",
    clientOnTime: meeting.clientOnTime ?? true,
    overran: meeting.overran ?? false,
    emailSentToClient: meeting.emailSentToClient ?? false,
    aiSummaryReady: meeting.aiSummaryReady ?? false,
    summary: meeting.summary ?? "",
    transcriptPreview: meeting.transcriptPreview ?? "",
    actions: Array.isArray(meeting.actions) ? meeting.actions : [],
    reportMeta: meeting.reportMeta,
    recording: {
      videoUrl: meeting.recording?.videoUrl ?? "#",
      audioUrl: meeting.recording?.audioUrl ?? "#",
      driveFolderUrl: meeting.recording?.driveFolderUrl ?? "#",
      materialsUrl: meeting.recording?.materialsUrl ?? "#",
      recordingsUrl: meeting.recording?.recordingsUrl ?? "#",
    },
  };
}

function normalizeClient(client: Partial<Client>): Client {
  const fallbackSources = buildDefaultClientDataSources({
    programId: client.programId ?? "master-mind",
    programModules: Array.isArray(client.programModules) ? client.programModules : [],
    nextMilestone: client.nextMilestone ?? "",
    stage: client.stage ?? "",
    monthlyGoal: client.monthlyGoal ?? "",
  });

  const nextSources = fallbackSources.map((fallback) => {
    const source = client.dataSources?.find((item) => item.id === fallback.id);
    return normalizeDataSource(source, fallback);
  });

  return {
    id: client.id ?? "",
    name: client.name ?? "",
    company: client.company ?? "",
    email: client.email ?? "",
    phone: client.phone ?? "",
    city: client.city ?? "",
    timezone: client.timezone ?? "Europe/Belgrade",
    startDate: client.startDate ?? new Date().toISOString(),
    status: client.status ?? "Onboarding",
    stage: client.stage ?? "",
    riskLevel: client.riskLevel ?? "Nizak",
    monthlyGoal: client.monthlyGoal ?? "",
    notes: client.notes ?? "",
    tags: Array.isArray(client.tags) ? client.tags : [],
    programId: client.programId ?? "master-mind",
    consultantId: client.consultantId ?? "",
    managerId: client.managerId ?? "",
    programModules: Array.isArray(client.programModules) ? client.programModules : [],
    meetingAverageTarget: client.meetingAverageTarget ?? 4,
    driveRootUrl: client.driveRootUrl ?? "",
    assignments: Array.isArray(client.assignments)
      ? client.assignments.map((assignment) => ({
          consultantId: assignment.consultantId,
          specialty: assignment.specialty,
          module: assignment.module,
          responsibility: assignment.responsibility ?? "Lead",
        }))
      : [],
    analytics: {
      healthScore: client.analytics?.healthScore ?? 0,
      actionCompletion: client.analytics?.actionCompletion ?? 0,
      meetingConsistency: client.analytics?.meetingConsistency ?? 0,
      satisfactionScore: client.analytics?.satisfactionScore ?? 0,
      revenueDelta: client.analytics?.revenueDelta ?? 0,
      milestoneProgress: client.analytics?.milestoneProgress ?? 0,
    },
    revenueSnapshot: client.revenueSnapshot ?? "N/A",
    nextMilestone: client.nextMilestone ?? "",
    sharedActionBoard: Array.isArray(client.sharedActionBoard)
      ? client.sharedActionBoard
      : [],
    dataSources: nextSources,
    customerServiceNotes: Array.isArray(client.customerServiceNotes)
      ? (client.customerServiceNotes as CustomerServiceNote[])
      : buildDefaultCustomerServiceNotes(),
    documents: Array.isArray(client.documents) ? client.documents : [],
    resources: Array.isArray(client.resources) ? client.resources : [],
    meetings: Array.isArray(client.meetings)
      ? client.meetings.map(normalizeMeeting)
      : [],
  };
}

function normalizeAppData(payload: Partial<AppData>): AppData {
  return {
    programs: Array.isArray(payload.programs) ? payload.programs : seedPrograms,
    staffUsers: Array.isArray(payload.staffUsers) ? payload.staffUsers : seedStaffUsers,
    clients: Array.isArray(payload.clients)
      ? payload.clients.map(normalizeClient)
      : seedClients.map(normalizeClient),
    clientPortalUsers: Array.isArray(payload.clientPortalUsers)
      ? payload.clientPortalUsers
      : seedClientPortalUsers,
    transferSuggestions: Array.isArray(payload.transferSuggestions)
      ? payload.transferSuggestions
      : seedTransferSuggestions,
    reportTemplates:
      Array.isArray(payload.reportTemplates) && payload.reportTemplates.length
        ? (payload.reportTemplates as ReportTemplate[])
        : seedReportTemplates,
    integrationRuns: Array.isArray(payload.integrationRuns)
      ? (payload.integrationRuns as IntegrationRun[])
      : seedIntegrationRuns,
    automationDispatchLog: Array.isArray(payload.automationDispatchLog)
      ? (payload.automationDispatchLog as AutomationDispatchLog[])
      : seedAutomationDispatchLog,
  };
}

async function ensureSnapshotTable() {
  if (!sql) {
    return;
  }

  const existing = await sql<{ existing: string | null }[]>`
    select to_regclass('public.app_snapshots') as existing
  `;

  if (existing[0]?.existing) {
    return;
  }

  await sql`
    create table if not exists app_snapshots (
      key text primary key,
      payload jsonb not null,
      updated_at timestamptz not null default now()
    )
  `;
}

async function loadOrSeedSnapshot() {
  if (!sql) {
    return createSeedAppData();
  }

  await ensureSnapshotTable();

  const existing = await sql<{ payload: AppData }[]>`
    select payload
    from app_snapshots
    where key = ${SNAPSHOT_KEY}
    limit 1
  `;

  if (existing[0]?.payload) {
    return normalizeAppData(existing[0].payload);
  }

  const seedData = createSeedAppData();

  await sql`
    insert into app_snapshots (key, payload)
    values (${SNAPSHOT_KEY}, ${sql.json(seedData)})
    on conflict (key) do nothing
  `;

  return seedData;
}

async function persistSnapshot(payload: AppData) {
  if (!sql) {
    return payload;
  }

  await ensureSnapshotTable();

  await sql`
    insert into app_snapshots (key, payload, updated_at)
    values (${SNAPSHOT_KEY}, ${sql.json(payload)}, now())
    on conflict (key) do update
    set payload = excluded.payload,
        updated_at = now()
  `;

  return payload;
}

export const loadAppData = cache(async (): Promise<AppData> => {
  if (!hasDatabase()) {
    return normalizeAppData(createSeedAppData());
  }

  return normalizeAppData(await loadOrSeedSnapshot());
});

export async function updateAppData(
  updater: (draft: AppData) => AppData | void | Promise<AppData | void>,
) {
  const current = await loadOrSeedSnapshot();
  const draft = structuredClone(current);
  const updated = await updater(draft);
  const nextData = updated ?? draft;

  await persistSnapshot(nextData);

  return nextData;
}

export function getProgramById(data: AppData, programId: string) {
  return data.programs.find((program) => program.id === programId);
}

export function getConsultantById(data: AppData, consultantId: string) {
  return data.staffUsers.find((staff) => staff.id === consultantId);
}

export function getClientById(data: AppData, clientId: string) {
  return data.clients.find((client) => client.id === clientId);
}

export function getClientsForConsultant(data: AppData, consultantId: string) {
  return data.clients.filter((client) =>
    client.assignments.some((assignment) => assignment.consultantId === consultantId),
  );
}

export function getStaffUserById(data: AppData, staffId: string) {
  return data.staffUsers.find((staff) => staff.id === staffId);
}

export function getPortalUserById(data: AppData, actorId: string) {
  return data.clientPortalUsers.find((user) => user.id === actorId);
}

export function getWorkspaceActor(data: AppData, actorId: string) {
  return [
    ...data.staffUsers,
    ...data.clientPortalUsers,
  ].find((actor) => actor.id === actorId);
}

export function getManagedConsultants(data: AppData, managerId: string) {
  const manager = getStaffUserById(data, managerId);
  if (!manager?.directReportIds?.length) {
    return [];
  }

  return manager.directReportIds
    .map((reportId) => getStaffUserById(data, reportId))
    .filter((staff): staff is StaffUser => Boolean(staff));
}

export function getVisibleClientsForActor(data: AppData, actor: WorkspaceActor) {
  if (actor.kind === "client") {
    const client = getClientById(data, actor.clientId);
    return client ? [client] : [];
  }

  if (actor.role === "manager") {
    const team = getManagedConsultants(data, actor.id);
    const consultantIds = team.map((item) => item.id);

    return data.clients.filter((client) =>
      client.assignments.some((assignment) =>
        consultantIds.includes(assignment.consultantId),
      ),
    );
  }

  return getClientsForConsultant(data, actor.id);
}

export function getClientUserForClient(data: AppData, clientId: string) {
  return data.clientPortalUsers.find((user) => user.clientId === clientId);
}

export function getNavigationForActor(
  data: AppData,
  actor: WorkspaceActor,
): NavigationItem[] {
  if (actor.kind === "client") {
    return [
      { group: "work", label: "Pregled", href: `/workspace/${actor.id}` },
      {
        group: "work",
        label: "Sastanci",
        href: `/workspace/${actor.id}/meetings`,
      },
      {
        group: "personal",
        label: "Analitika",
        href: `/workspace/${actor.id}/analytics`,
      },
      {
        group: "personal",
        label: "Materijali",
        href: `/workspace/${actor.id}/resources`,
      },
    ];
  }

  const items: NavigationItem[] = [
    { group: "work", label: "Pregled", href: `/workspace/${actor.id}` },
    {
      group: "work",
      label: "Klijenti",
      href: `/workspace/${actor.id}/clients`,
      badge: String(getVisibleClientsForActor(data, actor).length),
    },
    {
      group: "work",
      label: "Analitika",
      href: `/workspace/${actor.id}/analytics`,
    },
    {
      group: "personal",
      label: "Programi",
      href: `/workspace/${actor.id}/programs`,
      badge: String(data.programs.length),
    },
  ];

  if (actor.role === "manager") {
    items.push({
      group: "personal",
      label: "Tim",
      href: `/workspace/${actor.id}/team`,
      badge: String(getManagedConsultants(data, actor.id).length),
    });
  }

  if (actor.adminAddon) {
    items.push({
      group: "admin",
      label: "Setup",
      href: `/workspace/${actor.id}/admin`,
      badge: "ADD-ON",
    });
  }

  return items;
}
