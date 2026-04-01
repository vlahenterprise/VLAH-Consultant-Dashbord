import { cache } from "react";
import { hasDatabase, sql } from "@/lib/db";
import {
  clientPortalUsers as seedClientPortalUsers,
  clients as seedClients,
  programs as seedPrograms,
  staffUsers as seedStaffUsers,
  transferSuggestions as seedTransferSuggestions,
} from "@/lib/mock-data";
import {
  AppData,
  NavigationItem,
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
  });
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
    return existing[0].payload;
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
    return createSeedAppData();
  }

  return loadOrSeedSnapshot();
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
      { group: "work", label: "Dashboard", href: `/workspace/${actor.id}` },
      {
        group: "work",
        label: "Meetings",
        href: `/workspace/${actor.id}/meetings`,
      },
      {
        group: "personal",
        label: "Analytics",
        href: `/workspace/${actor.id}/analytics`,
      },
      {
        group: "personal",
        label: "Resources",
        href: `/workspace/${actor.id}/resources`,
      },
    ];
  }

  const items: NavigationItem[] = [
    { group: "work", label: "Dashboard", href: `/workspace/${actor.id}` },
    {
      group: "work",
      label: "Clients",
      href: `/workspace/${actor.id}/clients`,
      badge: String(getVisibleClientsForActor(data, actor).length),
    },
    {
      group: "work",
      label: "Analytics",
      href: `/workspace/${actor.id}/analytics`,
    },
    {
      group: "personal",
      label: "Programs",
      href: `/workspace/${actor.id}/programs`,
      badge: String(data.programs.length),
    },
  ];

  if (actor.role === "manager") {
    items.push({
      group: "personal",
      label: "Team",
      href: `/workspace/${actor.id}/team`,
      badge: String(getManagedConsultants(data, actor.id).length),
    });
  }

  if (actor.adminAddon) {
    items.push({
      group: "admin",
      label: "Admin",
      href: `/workspace/${actor.id}/admin`,
      badge: "ADD-ON",
    });
  }

  return items;
}
