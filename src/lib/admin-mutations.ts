import {
  getMeetingTemplatesForProgram,
  integrationBlueprints,
} from "@/lib/admin-blueprints";
import {
  generateMeetingReportPreview,
  mergeSuggestedActions,
} from "@/lib/ai-reporting";
import { getPendingAutomationQueue } from "@/lib/automation-center";
import {
  getProgramById,
  updateAppData,
} from "@/lib/app-data";
import {
  buildDefaultClientDataSources,
  buildDefaultCustomerServiceNotes,
} from "@/lib/operations-defaults";
import {
  AppData,
  AutomationDispatchLog,
  BdpImportRow,
  Client,
  ClientAssignment,
  ClientDataSource,
  EmployeeRole,
  IntegrationId,
  IntegrationRun,
  MeetingAction,
  Meeting,
  MeetingReportPreview,
  MeetingTemplate,
  ReportTemplate,
  StaffUser,
} from "@/lib/types";

type CreateClientInput = {
  name: string;
  company: string;
  email: string;
  phone?: string;
  city: string;
  timezone?: string;
  programId: string;
  managerId?: string;
  assignments: {
    module: string;
    consultantId: string;
  }[];
};

type CreateStaffInput = {
  name: string;
  email: string;
  title: string;
  role: EmployeeRole;
  adminAddon: boolean;
  team: string;
  focus: string;
  specialties: string[];
};

type UpdateClientAssignmentsInput = {
  clientId: string;
  assignments: ClientAssignment[];
};

type UpdateClientDataSourcesInput = {
  clientId: string;
  dataSources: ClientDataSource[];
  noteTitle?: string;
  noteDetails?: string;
  noteOwner?: string;
};

type UpdateReportTemplateInput = {
  templateId: string;
  name: string;
  reportType: string;
  audience: ReportTemplate["audience"];
  description: string;
  prePrompt: string;
  prompt: string;
  outputSections: string[];
};

type SaveMeetingReportInput = {
  clientId: string;
  meetingId: string;
  templateId: string;
  expertOwnerId: string;
  transcript: string;
  internalNotes?: string;
  actualStartAt: string;
  endedAt: string;
  status: Meeting["status"];
  clientOnTime: boolean;
  emailSentToClient: boolean;
  includeSourceIds: string[];
  preview?: MeetingReportPreview;
};

type SaveClientActionBoardInput = {
  clientId: string;
  scope: "shared" | "meeting";
  meetingId?: string;
  actions: MeetingAction[];
};

type UpsertClientMeetingInput = {
  clientId: string;
  meetingId?: string;
  title: string;
  type: string;
  scheduledStartAt: string;
  durationMinutes: number;
  modules: string[];
  participants: string[];
  status: Meeting["status"];
  summary?: string;
  videoUrl: string;
  audioUrl: string;
  driveFolderUrl: string;
  materialsUrl: string;
  recordingsUrl: string;
};

type RunIntegrationSyncInput = {
  integrationId: IntegrationId;
  clientId?: string;
};

type DispatchAutomationInput = {
  queueItemId: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildId(prefix: string, value: string) {
  return `${prefix}-${slugify(value)}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function buildIntegrationRun(
  input: Omit<IntegrationRun, "id">,
): IntegrationRun {
  return {
    id: buildId("integration-run", `${input.integrationId}-${input.clientId ?? "global"}`),
    ...input,
  };
}

function toTitleFromModule(module: string) {
  if (module === "Profitabilnost") {
    return "Profitability Consultant";
  }
  if (module === "Organizacija") {
    return "Organization Consultant";
  }
  if (module === "Operations") {
    return "Fractional Operations Manager";
  }
  if (module === "Finance") {
    return "Finance Director";
  }
  if (module === "HR & Leadership") {
    return "HR Fractional Director";
  }

  return "Consultant";
}

function addDays(baseDate: Date, days: number, hour: number) {
  const next = new Date(baseDate);
  next.setDate(next.getDate() + days);
  next.setHours(hour, 0, 0, 0);
  return next;
}

function addMinutes(dateIso: string, minutes: number) {
  const date = new Date(dateIso);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

function resolveMeetingDate(value: string | undefined, fallback: Date) {
  if (!value) {
    return fallback.toISOString();
  }

  const direct = new Date(value);
  if (!Number.isNaN(direct.getTime())) {
    return direct.toISOString();
  }

  const normalized = value.trim().replace(/\./g, "-").replace(/\s+/g, " ");
  const normalizedDate = new Date(normalized);

  if (!Number.isNaN(normalizedDate.getTime())) {
    return normalizedDate.toISOString();
  }

  return fallback.toISOString();
}

function buildParticipants(
  data: AppData,
  clientName: string,
  assignments: Client["assignments"],
  template: MeetingTemplate,
) {
  const participantSet = new Set<string>([clientName]);

  template.modules.forEach((module) => {
    const assignment = assignments.find((item) => item.module === module);
    const consultant = data.staffUsers.find(
      (staff) => staff.id === assignment?.consultantId,
    );

    if (consultant) {
      participantSet.add(consultant.name);
      return;
    }

    const fallbackTitle = template.participants.find((participant) =>
      participant.toLowerCase().includes(module.toLowerCase()),
    );

    if (fallbackTitle) {
      participantSet.add(fallbackTitle);
    }
  });

  return Array.from(participantSet);
}

function buildMeeting(
  data: AppData,
  clientName: string,
  driveRootUrl: string,
  assignments: Client["assignments"],
  template: MeetingTemplate,
  scheduledStartAt: string,
) {
  const meetingId = buildId("meeting", `${clientName}-${template.id}`);

  return {
    id: meetingId,
    title: template.title,
    date: scheduledStartAt,
    scheduledStartAt,
    actualStartAt: scheduledStartAt,
    endedAt: addMinutes(scheduledStartAt, template.durationMinutes),
    durationMinutes: template.durationMinutes,
    type: template.type,
    modules: template.modules,
    participants: buildParticipants(data, clientName, assignments, template),
    status: "Zakazan",
    clientOnTime: true,
    overran: false,
    emailSentToClient: false,
    aiSummaryReady: false,
    summary:
      "Izvestaj ce biti generisan posle odrzanog sastanka i obrade audio transkripta.",
    transcriptPreview: "",
    actions: [],
    recording: {
      videoUrl: `${driveRootUrl}/video/${meetingId}`,
      audioUrl: `${driveRootUrl}/audio/${meetingId}`,
      driveFolderUrl: `${driveRootUrl}/meetings/${meetingId}`,
      materialsUrl: `${driveRootUrl}/materials/${meetingId}`,
      recordingsUrl: `${driveRootUrl}/recordings/${meetingId}`,
    },
  } satisfies Meeting;
}

function pickManager(data: AppData, preferredManagerId?: string) {
  if (preferredManagerId) {
    const manager = data.staffUsers.find((staff) => staff.id === preferredManagerId);
    if (manager?.role === "manager") {
      return manager.id;
    }
  }

  return data.staffUsers.find((staff) => staff.role === "manager")?.id ?? "";
}

function pickConsultantForModule(data: AppData, module: string) {
  const specialtyMatchers: Record<string, string[]> = {
    Profitabilnost: ["Profitability", "Finance"],
    Organizacija: ["Organization", "Operations"],
    Operations: ["Operations", "Organization"],
    Finance: ["Finance", "Profitability"],
    "HR & Leadership": ["HR & Leadership", "HR"],
  };

  const consultant = data.staffUsers.find(
    (staff) =>
      staff.role === "consultant" &&
      specialtyMatchers[module]?.some((matcher) =>
        staff.specialties.includes(matcher),
      ),
  );

  return consultant?.id ?? data.staffUsers.find((staff) => staff.role === "consultant")?.id ?? "";
}

function buildAssignments(
  data: AppData,
  programId: string,
  requestedAssignments?: CreateClientInput["assignments"],
) {
  const program = getProgramById(data, programId);
  const modules = program?.modules ?? [];

  return modules.map((module) => {
    const requested = requestedAssignments?.find((item) => item.module === module);
    const consultantId =
      requested?.consultantId || pickConsultantForModule(data, module);

    return {
      module,
      consultantId,
      specialty: toTitleFromModule(module),
      responsibility: "Lead" as const,
    };
  });
}

function normalizeAssignments(assignments: ClientAssignment[]) {
  return assignments
    .filter((assignment) => assignment.consultantId && assignment.module)
    .map((assignment) => ({
      consultantId: assignment.consultantId,
      module: assignment.module,
      specialty: assignment.specialty || toTitleFromModule(assignment.module),
      responsibility: assignment.responsibility ?? "Lead",
    }));
}

function isValidIsoDate(value: string) {
  return !Number.isNaN(new Date(value).getTime());
}

function getClientActionSource(client: Client) {
  return client.sharedActionBoard.length > 0
    ? client.sharedActionBoard
    : client.meetings.flatMap((meeting) => meeting.actions);
}

function getActionCompletion(action: MeetingAction) {
  if (typeof action.completionPercent === "number") {
    return clamp(action.completionPercent, 0, 100);
  }

  return action.done ? 100 : 0;
}

function normalizeActionList(actions: MeetingAction[]) {
  return actions
    .filter((action) => action.title?.trim())
    .map((action, index) => {
      const owner: MeetingAction["owner"] =
        action.owner === "Klijent" ? "Klijent" : "Konsultant";

      return {
        id: action.id || buildId("action", `${action.title}-${index}`),
        title: action.title.trim(),
        owner,
        priority: action.priority ?? "Srednji",
        completionPercent: action.done ? 100 : getActionCompletion(action),
        dueDate: isValidIsoDate(action.dueDate)
          ? new Date(action.dueDate).toISOString()
          : new Date().toISOString(),
        done: Boolean(action.done),
        sharedWithClient: Boolean(action.sharedWithClient),
        reminderBeforeDue: Boolean(action.reminderBeforeDue),
        reminderWhenOverdue: Boolean(action.reminderWhenOverdue),
        reminderOnCreate: Boolean(action.reminderOnCreate),
      };
    });
}

function refreshClientAnalytics(client: Client) {
  const actions = getClientActionSource(client);
  const overdueActions = actions.filter(
    (action) => !action.done && new Date(action.dueDate).getTime() < Date.now(),
  ).length;
  const actionCompletion = actions.length
    ? Math.round(
        actions.reduce((sum, action) => sum + getActionCompletion(action), 0) /
          actions.length,
      )
    : 0;

  const completedMeetings = client.meetings.filter(
    (meeting) => meeting.status !== "Zakazan",
  );
  const aiCoverage = completedMeetings.length
    ? Math.round(
        (completedMeetings.filter((meeting) => meeting.aiSummaryReady).length /
          completedMeetings.length) *
          100,
      )
    : 0;
  const onTimeRate = completedMeetings.length
    ? Math.round(
        (completedMeetings.filter((meeting) => meeting.clientOnTime).length /
          completedMeetings.length) *
          100,
      )
    : 0;
  const meetingConsistency = completedMeetings.length
    ? Math.round(onTimeRate * 0.5 + aiCoverage * 0.5)
    : 0;
  const targetUsage = client.meetingAverageTarget
    ? clamp(
        Math.round((client.meetings.length / client.meetingAverageTarget) * 100),
        0,
        100,
      )
    : 100;
  const milestoneProgress = clamp(
    Math.round(actionCompletion * 0.45 + targetUsage * 0.35 + aiCoverage * 0.2),
    0,
    100,
  );
  const riskPenalty =
    client.riskLevel === "Visok" ? 12 : client.riskLevel === "Srednji" ? 6 : 0;
  const healthScore = clamp(
    Math.round(
      actionCompletion * 0.35 +
        meetingConsistency * 0.35 +
        milestoneProgress * 0.3 -
        overdueActions * 4 -
        riskPenalty,
    ),
    0,
    100,
  );

  client.analytics = {
    ...client.analytics,
    healthScore,
    actionCompletion,
    meetingConsistency,
    milestoneProgress,
  };
}

function rebuildStaffClientIndex(draft: AppData) {
  draft.clients.forEach(refreshClientAnalytics);
  const now = Date.now();
  const nextWeek = now + 7 * 24 * 60 * 60 * 1000;

  draft.staffUsers = draft.staffUsers.map((staff) => ({
    ...staff,
    activeClientIds: draft.clients
      .filter((client) =>
        client.assignments.some((assignment) => assignment.consultantId === staff.id),
      )
      .map((client) => client.id),
    dashboard: (() => {
      const assignedClients = draft.clients.filter((client) =>
        client.assignments.some((assignment) => assignment.consultantId === staff.id),
      );
      const weeklyMeetings = assignedClients
        .flatMap((client) => client.meetings)
        .filter((meeting) => {
          const meetingTime = new Date(meeting.scheduledStartAt).getTime();
          return meetingTime >= now && meetingTime <= nextWeek;
        }).length;
      const openActions = assignedClients
        .flatMap((client) => getClientActionSource(client))
        .filter((action) => !action.done).length;
      const pendingSummaries = assignedClients
        .flatMap((client) => client.meetings)
        .filter((meeting) => meeting.status !== "Zakazan" && !meeting.aiSummaryReady)
        .length;
      const avgHealth = assignedClients.length
        ? Math.round(
            assignedClients.reduce(
              (sum, client) => sum + client.analytics.healthScore,
              0,
            ) / assignedClients.length,
          )
        : 0;

      return {
        weeklyMeetings,
        openActions,
        pendingSummaries,
        utilization: clamp(Math.round((assignedClients.length / 6) * 100), 0, 100),
        clientSatisfaction: clamp(avgHealth + 6, 0, 100),
      };
    })(),
  }));
}

function getIntegrationBlueprint(integrationId: IntegrationId) {
  return integrationBlueprints.find((integration) => integration.id === integrationId);
}

function getMissingEnvKeys(integrationId: IntegrationId) {
  const blueprint = getIntegrationBlueprint(integrationId);
  if (!blueprint) {
    return [];
  }

  return blueprint.envKeys.filter((key) => !process.env[key]);
}

function buildInitialMeetings(
  data: AppData,
  clientName: string,
  driveRootUrl: string,
  programId: string,
  assignments: Client["assignments"],
) {
  const templates = getMeetingTemplatesForProgram(programId);
  const baseDate = new Date();

  if (programId === "bdp") {
    return [
      buildMeeting(
        data,
        clientName,
        driveRootUrl,
        assignments,
        templates[0],
        addDays(baseDate, 3, 10).toISOString(),
      ),
      buildMeeting(
        data,
        clientName,
        driveRootUrl,
        assignments,
        templates[1],
        addDays(baseDate, 16, 10).toISOString(),
      ),
      buildMeeting(
        data,
        clientName,
        driveRootUrl,
        assignments,
        templates[2],
        addDays(baseDate, 18, 11).toISOString(),
      ),
      buildMeeting(
        data,
        clientName,
        driveRootUrl,
        assignments,
        templates[3],
        addDays(baseDate, 20, 12).toISOString(),
      ),
    ];
  }

  return [
    buildMeeting(
      data,
      clientName,
      driveRootUrl,
      assignments,
      templates[0],
      addDays(baseDate, 3, 10).toISOString(),
    ),
    buildMeeting(
      data,
      clientName,
      driveRootUrl,
      assignments,
      templates[1],
      addDays(baseDate, 10, 11).toISOString(),
    ),
    buildMeeting(
      data,
      clientName,
      driveRootUrl,
      assignments,
      templates[2],
      addDays(baseDate, 14, 12).toISOString(),
    ),
  ];
}

function createPortalUser(client: Client) {
  return {
    kind: "client" as const,
    id: `portal-${client.id}`,
    clientId: client.id,
    name: client.name,
    email: client.email,
    company: client.company,
    portalLabel: "Portal klijenta",
  };
}

function buildClientRecord(data: AppData, input: CreateClientInput) {
  const program = getProgramById(data, input.programId);
  if (!program) {
    throw new Error("Nepostojeci program.");
  }

  const assignments = buildAssignments(data, program.id, input.assignments);
  const driveRootUrl = `https://drive.google.com/drive/folders/${slugify(
    `${program.id}-${input.company}`,
  )}`;
  const clientId = slugify(input.name);

  const client = {
    id: clientId,
    name: input.name,
    company: input.company,
    email: input.email,
    phone: input.phone || "",
    city: input.city,
    timezone: input.timezone || "Europe/Belgrade",
    startDate: new Date().toISOString(),
    status: "Onboarding",
    stage:
      program.id === "bdp"
        ? "Monthly cadence setup"
        : "Kickoff scheduling i assignment setup",
    riskLevel: "Nizak",
    monthlyGoal:
      program.id === "bdp"
        ? "Pokrenuti prvi mesecni 3:1 i povezati zajednicku action listu."
        : "Zakazati zajednicki kickoff i otvoriti oba konsultantska toka.",
    notes:
      program.id === "bdp"
        ? "Kreiran iz admin setup-a sa BDP cadence i jedinstvenom akcionom listom."
        : "Kreiran iz admin setup-a sa Master Mind kickoff i split workflow logikom.",
    tags: [program.name, ...program.modules],
    programId: program.id,
    consultantId: assignments[0]?.consultantId ?? "",
    managerId: pickManager(data, input.managerId),
    programModules: program.modules,
    meetingAverageTarget: 4,
    driveRootUrl,
    assignments,
    analytics: {
      healthScore: 72,
      actionCompletion: 0,
      meetingConsistency: 0,
      satisfactionScore: 0,
      revenueDelta: 0,
      milestoneProgress: 5,
    },
    revenueSnapshot: "N/A",
    nextMilestone:
      program.id === "bdp"
        ? "Zakljucati prvi mesecni kickoff i podeliti action board klijentu."
        : "Zakazati zajednicki kickoff i podeliti booking link oba eksperta.",
    sharedActionBoard: [],
    dataSources: buildDefaultClientDataSources({
      programId: program.id,
      programModules: program.modules,
      nextMilestone:
        program.id === "bdp"
          ? "Zakljucati prvi mesecni kickoff i podeliti action board klijentu."
          : "Zakazati zajednicki kickoff i podeliti booking link oba eksperta.",
      stage:
        program.id === "bdp"
          ? "Monthly cadence setup"
          : "Kickoff scheduling i assignment setup",
      monthlyGoal:
        program.id === "bdp"
          ? "Pokrenuti prvi mesecni 3:1 i povezati zajednicku action listu."
          : "Zakazati zajednicki kickoff i otvoriti oba konsultantska toka.",
    }),
    customerServiceNotes: buildDefaultCustomerServiceNotes(),
    documents: [],
    resources: [],
    meetings: buildInitialMeetings(
      data,
      input.name,
      driveRootUrl,
      program.id,
      assignments,
    ),
  } satisfies Client;

  return client;
}

export async function createClient(input: CreateClientInput) {
  return updateAppData((draft) => {
    if (draft.clients.some((client) => client.email === input.email)) {
      throw new Error("Klijent sa ovim email-om vec postoji.");
    }

    const client = buildClientRecord(draft, input);
    draft.clients = [client, ...draft.clients];

    if (!draft.clientPortalUsers.some((user) => user.clientId === client.id)) {
      draft.clientPortalUsers = [createPortalUser(client), ...draft.clientPortalUsers];
    }

    rebuildStaffClientIndex(draft);

    return draft;
  });
}

export async function createStaffUser(input: CreateStaffInput) {
  return updateAppData((draft) => {
    if (draft.staffUsers.some((user) => user.email === input.email)) {
      throw new Error("Zaposleni sa ovim email-om vec postoji.");
    }

    const staff = {
      kind: "staff" as const,
      id: slugify(input.name),
      name: input.name,
      email: input.email,
      title: input.title,
      role: input.role,
      adminAddon: input.adminAddon,
      team: input.team,
      focus: input.focus,
      specialties: input.specialties,
      nextAvailableSlot: addDays(new Date(), 2, 10).toISOString(),
      activeClientIds: [],
      directReportIds: input.role === "manager" ? [] : undefined,
      dashboard: {
        weeklyMeetings: 0,
        openActions: 0,
        pendingSummaries: 0,
        utilization: 0,
        clientSatisfaction: 0,
      },
    } satisfies StaffUser;

    draft.staffUsers = [staff, ...draft.staffUsers];
    return draft;
  });
}

function createBdpClientForImport(
  data: AppData,
  row: BdpImportRow,
) {
  const assignments = buildAssignments(data, "bdp");
  const driveRootUrl = `https://drive.google.com/drive/folders/${slugify(
    `bdp-${row.company || row.clientName}`,
  )}`;

  return {
    id: slugify(row.clientName),
    name: row.clientName,
    company: row.company || row.clientName,
    email: row.email || `${slugify(row.clientName)}@placeholder.vlah.rs`,
    phone: "",
    city: row.city || "Beograd",
    timezone: "Europe/Belgrade",
    startDate: new Date().toISOString(),
    status: "Onboarding",
    stage: "BDP import onboarding",
    riskLevel: "Nizak",
    monthlyGoal:
      "Pokrenuti mesecni 3:1 i tri pojedinacna follow-up sastanka iz import batch-a.",
    notes: "Kreiran iz BDP Excel import-a.",
    tags: ["BDP", "Operations", "Finance", "HR & Leadership"],
    programId: "bdp",
    consultantId: assignments[0]?.consultantId ?? "",
    managerId: pickManager(data),
    programModules: ["Operations", "Finance", "HR & Leadership"],
    meetingAverageTarget: 4,
    driveRootUrl,
    assignments,
    analytics: {
      healthScore: 70,
      actionCompletion: 0,
      meetingConsistency: 0,
      satisfactionScore: 0,
      revenueDelta: 0,
      milestoneProgress: 8,
    },
    revenueSnapshot: "N/A",
    nextMilestone: "Potvrditi monthly cadence i podeliti client portal pristup.",
    sharedActionBoard: [],
    dataSources: buildDefaultClientDataSources({
      programId: "bdp",
      programModules: ["Operations", "Finance", "HR & Leadership"],
      nextMilestone: "Potvrditi monthly cadence i podeliti client portal pristup.",
      stage: "BDP import onboarding",
      monthlyGoal:
        "Pokrenuti mesecni 3:1 i tri pojedinacna follow-up sastanka iz import batch-a.",
    }),
    customerServiceNotes: buildDefaultCustomerServiceNotes(),
    documents: [],
    resources: [],
    meetings: [],
  } satisfies Client;
}

function maybeAppendMeeting(
  data: AppData,
  client: Client,
  templateId: string,
  dateValue: string | undefined,
  fallback: Date,
) {
  if (!dateValue) {
    return;
  }

  const template = getMeetingTemplatesForProgram("bdp").find(
    (item) => item.id === templateId,
  );
  if (!template) {
    return;
  }

  const scheduledStartAt = resolveMeetingDate(dateValue, fallback);

  const exists = client.meetings.some(
    (meeting) =>
      meeting.title === template.title &&
      meeting.scheduledStartAt === scheduledStartAt,
  );

  if (exists) {
    return;
  }

  client.meetings.push(
    buildMeeting(
      data,
      client.name,
      client.driveRootUrl,
      client.assignments,
      template,
      scheduledStartAt,
    ),
  );
}

export async function importBdpSchedule(rows: BdpImportRow[]) {
  return updateAppData((draft) => {
    rows.forEach((row, index) => {
      const email = row.email?.trim().toLowerCase();
      const client =
        draft.clients.find(
          (item) =>
            item.programId === "bdp" &&
            email &&
            item.email.toLowerCase() === email,
        ) ||
        draft.clients.find(
          (item) =>
            item.programId === "bdp" &&
            (
              item.name.toLowerCase() === row.clientName.trim().toLowerCase() ||
              item.company.toLowerCase() === row.company.trim().toLowerCase()
            ),
        );

      const targetClient = client ?? createBdpClientForImport(draft, row);

      if (!client) {
        draft.clients = [targetClient, ...draft.clients];

        if (!draft.clientPortalUsers.some((user) => user.clientId === targetClient.id)) {
          draft.clientPortalUsers = [
            createPortalUser(targetClient),
            ...draft.clientPortalUsers,
          ];
        }
      }

      const baseDate = addDays(new Date(), 3 + index, 10);
      maybeAppendMeeting(
        draft,
        targetClient,
        "bdp-monthly-kickoff",
        row.monthlyKickoffAt,
        baseDate,
      );
      maybeAppendMeeting(
        draft,
        targetClient,
        "bdp-operations-review",
        row.operationsAt,
        addDays(baseDate, 12, 10),
      );
      maybeAppendMeeting(
        draft,
        targetClient,
        "bdp-finance-review",
        row.financeAt,
        addDays(baseDate, 14, 11),
      );
      maybeAppendMeeting(
        draft,
        targetClient,
        "bdp-hr-review",
        row.hrLeadershipAt,
        addDays(baseDate, 16, 12),
      );
    });

    rebuildStaffClientIndex(draft);

    return draft;
  });
}

export async function updateClientAssignments(input: UpdateClientAssignmentsInput) {
  return updateAppData((draft) => {
    const client = draft.clients.find((item) => item.id === input.clientId);
    if (!client) {
      throw new Error("Klijent nije pronadjen.");
    }

    const nextAssignments = normalizeAssignments(input.assignments);
    if (!nextAssignments.length) {
      throw new Error("Potrebna je bar jedna dodela eksperta.");
    }

    const missingCoverage = client.programModules.filter(
      (module) => !nextAssignments.some((assignment) => assignment.module === module),
    );

    if (missingCoverage.length) {
      throw new Error(
        `Nedostaje pokrivenost za module: ${missingCoverage.join(", ")}.`,
      );
    }

    client.assignments = nextAssignments;
    client.consultantId =
      nextAssignments.find((assignment) => assignment.responsibility === "Lead")
        ?.consultantId ??
      nextAssignments[0]?.consultantId ??
      "";

    rebuildStaffClientIndex(draft);
    return draft;
  });
}

export async function updateClientDataSources(input: UpdateClientDataSourcesInput) {
  return updateAppData((draft) => {
    const client = draft.clients.find((item) => item.id === input.clientId);
    if (!client) {
      throw new Error("Klijent nije pronadjen.");
    }

    client.dataSources = input.dataSources.map((source) => ({
      ...source,
      metrics: Array.isArray(source.metrics) ? source.metrics : [],
    }));

    if (input.noteTitle?.trim() && input.noteDetails?.trim()) {
      client.customerServiceNotes = [
        {
          id: buildId("cs-note", `${client.id}-${input.noteTitle}`),
          title: input.noteTitle.trim(),
          details: input.noteDetails.trim(),
          owner: input.noteOwner?.trim() || "Customer Service",
          updatedAt: new Date().toISOString(),
        },
        ...client.customerServiceNotes,
      ];
    }

    return draft;
  });
}

export async function updateReportTemplate(input: UpdateReportTemplateInput) {
  return updateAppData((draft) => {
    const template = draft.reportTemplates.find((item) => item.id === input.templateId);
    if (!template) {
      throw new Error("Report template nije pronadjen.");
    }

    template.name = input.name.trim();
    template.reportType = input.reportType.trim();
    template.audience = input.audience;
    template.description = input.description.trim();
    template.prePrompt = input.prePrompt.trim();
    template.prompt = input.prompt.trim();
    template.outputSections = input.outputSections.filter(Boolean);

    return draft;
  });
}

export async function saveMeetingReport(input: SaveMeetingReportInput) {
  return updateAppData((draft) => {
    const client = draft.clients.find((item) => item.id === input.clientId);
    if (!client) {
      throw new Error("Klijent nije pronadjen.");
    }

    const meeting = client.meetings.find((item) => item.id === input.meetingId);
    if (!meeting) {
      throw new Error("Sastanak nije pronadjen.");
    }

    const template = draft.reportTemplates.find((item) => item.id === input.templateId);
    if (!template) {
      throw new Error("Report template nije pronadjen.");
    }

    const preview =
      input.preview ??
      generateMeetingReportPreview({
        client,
        meeting,
        transcript: input.transcript,
        template,
        internalNotes: input.internalNotes,
        sourceIds: input.includeSourceIds,
      });

    meeting.actualStartAt = input.actualStartAt;
    meeting.endedAt = input.endedAt;
    meeting.date = input.actualStartAt;
    meeting.durationMinutes = Math.max(
      1,
      Math.round(
        (new Date(input.endedAt).getTime() - new Date(input.actualStartAt).getTime()) /
          60000,
      ),
    );
    meeting.status = input.status;
    meeting.clientOnTime = input.clientOnTime;
    meeting.overran = meeting.durationMinutes > 60;
    meeting.emailSentToClient = input.emailSentToClient;
    meeting.aiSummaryReady = true;
    meeting.summary = [
      preview.overview,
      preview.keyPoints.length ? `Kljucno: ${preview.keyPoints.join(" | ")}` : "",
      input.internalNotes?.trim() ? `Napomena eksperta: ${input.internalNotes.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
    meeting.transcriptPreview = input.transcript.trim().slice(0, 1500);
    meeting.reportMeta = {
      templateId: preview.templateId,
      templateName: preview.templateName,
      reportType: preview.reportType,
      expertOwnerId: input.expertOwnerId,
      safeClientLabel: preview.safeContext.clientLabel,
      excludedFields: preview.safeContext.removedFields,
      sourceIds: input.includeSourceIds,
      savedAt: new Date().toISOString(),
    };

    const actionDueDate = new Date(input.endedAt);
    actionDueDate.setDate(actionDueDate.getDate() + 7);

    meeting.actions = mergeSuggestedActions({
      existingActions: meeting.actions,
      preview,
      dueDate: actionDueDate.toISOString(),
    });

    if (client.programId === "bdp" || client.sharedActionBoard.length) {
      client.sharedActionBoard = mergeSuggestedActions({
        existingActions: client.sharedActionBoard,
        preview,
        dueDate: actionDueDate.toISOString(),
      });
    }

    rebuildStaffClientIndex(draft);
    return draft;
  });
}

export async function saveClientActionBoard(input: SaveClientActionBoardInput) {
  return updateAppData((draft) => {
    const client = draft.clients.find((item) => item.id === input.clientId);
    if (!client) {
      throw new Error("Klijent nije pronadjen.");
    }

    const normalizedActions = normalizeActionList(input.actions);

    if (input.scope === "shared") {
      client.sharedActionBoard = normalizedActions;
    } else {
      const meeting = client.meetings.find((item) => item.id === input.meetingId);
      if (!meeting) {
        throw new Error("Sastanak za ovu action listu nije pronadjen.");
      }

      meeting.actions = normalizedActions;
    }

    rebuildStaffClientIndex(draft);
    return draft;
  });
}

export async function upsertClientMeeting(input: UpsertClientMeetingInput) {
  return updateAppData((draft) => {
    const client = draft.clients.find((item) => item.id === input.clientId);
    if (!client) {
      throw new Error("Klijent nije pronadjen.");
    }

    const scheduledStartAt = isValidIsoDate(input.scheduledStartAt)
      ? new Date(input.scheduledStartAt).toISOString()
      : new Date().toISOString();
    const durationMinutes = clamp(Math.round(input.durationMinutes || 60), 15, 240);
    const participants = input.participants
      .map((participant) => participant.trim())
      .filter(Boolean);
    const modules = input.modules.map((module) => module.trim()).filter(Boolean);

    if (!input.title.trim()) {
      throw new Error("Naziv sastanka je obavezan.");
    }

    if (!participants.length) {
      throw new Error("Potrebno je bar jedno ime u listi prisutnih.");
    }

    const existingMeeting = input.meetingId
      ? client.meetings.find((meeting) => meeting.id === input.meetingId)
      : undefined;

    const nextMeeting: Meeting = existingMeeting
      ? {
          ...existingMeeting,
          title: input.title.trim(),
          type: input.type.trim(),
          date: scheduledStartAt,
          scheduledStartAt,
          durationMinutes,
          modules,
          participants,
          status: input.status,
          summary: input.summary?.trim() || existingMeeting.summary,
          actualStartAt:
            existingMeeting.status === "Zakazan" ? scheduledStartAt : existingMeeting.actualStartAt,
          endedAt:
            existingMeeting.status === "Zakazan"
              ? addMinutes(scheduledStartAt, durationMinutes)
              : existingMeeting.endedAt,
          overran:
            existingMeeting.status === "Zakazan"
              ? false
              : existingMeeting.durationMinutes > 60,
          recording: {
            videoUrl: input.videoUrl.trim() || existingMeeting.recording.videoUrl,
            audioUrl: input.audioUrl.trim() || existingMeeting.recording.audioUrl,
            driveFolderUrl:
              input.driveFolderUrl.trim() || existingMeeting.recording.driveFolderUrl,
            materialsUrl:
              input.materialsUrl.trim() || existingMeeting.recording.materialsUrl,
            recordingsUrl:
              input.recordingsUrl.trim() || existingMeeting.recording.recordingsUrl,
          },
        }
      : {
          id: buildId("meeting", `${client.id}-${input.title}`),
          title: input.title.trim(),
          date: scheduledStartAt,
          scheduledStartAt,
          actualStartAt: scheduledStartAt,
          endedAt: addMinutes(scheduledStartAt, durationMinutes),
          durationMinutes,
          type: input.type.trim(),
          modules,
          participants,
          status: input.status,
          clientOnTime: true,
          overran: false,
          emailSentToClient: false,
          aiSummaryReady: false,
          summary:
            input.summary?.trim() ||
            "Planiran sastanak. Izvestaj ce biti dopunjen kada ekspert zavrsi obradu.",
          transcriptPreview: "",
          actions: [],
          recording: {
            videoUrl: input.videoUrl.trim() || "#",
            audioUrl: input.audioUrl.trim() || "#",
            driveFolderUrl: input.driveFolderUrl.trim() || client.driveRootUrl,
            materialsUrl: input.materialsUrl.trim() || client.driveRootUrl,
            recordingsUrl: input.recordingsUrl.trim() || client.driveRootUrl,
          },
        };

    if (existingMeeting) {
      client.meetings = client.meetings.map((meeting) =>
        meeting.id === existingMeeting.id ? nextMeeting : meeting,
      );
    } else {
      client.meetings = [...client.meetings, nextMeeting].sort(
        (left, right) =>
          new Date(left.scheduledStartAt).getTime() -
          new Date(right.scheduledStartAt).getTime(),
      );
    }

    rebuildStaffClientIndex(draft);
    return draft;
  });
}

export async function runIntegrationSync(input: RunIntegrationSyncInput) {
  return updateAppData((draft) => {
    const missingEnvKeys = getMissingEnvKeys(input.integrationId);
    const now = new Date().toISOString();
    const client = input.clientId
      ? draft.clients.find((item) => item.id === input.clientId)
      : undefined;

    if (input.clientId && !client) {
      throw new Error("Klijent za sync nije pronadjen.");
    }

    const details: string[] = [];
    let summary = "Manual sync je obradjen.";
    let status: IntegrationRun["status"] = missingEnvKeys.length
      ? "Ceka setup"
      : "Uspeh";

    if (input.integrationId === "thinkific" && client) {
      const source = client.dataSources.find((item) => item.id === "thinkific");
      if (source) {
        if (missingEnvKeys.length) {
          source.status = "Ceka sync";
          details.push(`Nedostaju kljucevi: ${missingEnvKeys.join(", ")}`);
        } else {
          source.status = "Povezano";
          source.externalId = source.externalId || `thinkific-${client.id}`;
          source.owner = "Customer Service";
          source.summary =
            "Thinkific profil je osvezen i spreman da puni portal napretkom kroz edukativni deo programa.";
          source.metrics = [
            `Program mapiran: ${client.programId}`,
            `Klijent portal spreman za progress signal`,
            `Moduli: ${client.programModules.join(" / ")}`,
          ];
          source.lastSyncedAt = now;
          details.push("Thinkific profil i progress metadata su osvezeni.");
        }
      }

      summary = missingEnvKeys.length
        ? "Thinkific sync ceka setup kredencijala."
        : "Thinkific sync je osvezen za klijenta.";
    }

    if (input.integrationId === "optiverse" && client) {
      const source = client.dataSources.find((item) => item.id === "ops-system");
      if (source) {
        if (missingEnvKeys.length) {
          source.status = "Rucno";
          details.push(`Nedostaju kljucevi: ${missingEnvKeys.join(", ")}`);
        } else {
          source.status = "Povezano";
          source.externalId = source.externalId || `optiverse-${client.id}`;
          source.owner = "Customer Service";
          source.summary =
            "Optiverse profil je povezan i sada vraca operativni milestone, handoff signal i prioritetne napomene za tim.";
          source.metrics = [
            `Stage: ${client.stage}`,
            `Milestone: ${client.nextMilestone}`,
            `Goal: ${client.monthlyGoal}`,
          ];
          source.lastSyncedAt = now;
          details.push("Optiverse profil je povezan na karticu klijenta.");
        }
      }

      summary = missingEnvKeys.length
        ? "Optiverse sync ceka setup kredencijala."
        : "Optiverse signal je osvezen za klijenta.";
    }

    if (input.integrationId === "zoom" && client) {
      const upcomingMeetings = client.meetings.filter(
        (meeting) => meeting.status === "Zakazan",
      );

      if (missingEnvKeys.length) {
        details.push(`Nedostaju kljucevi: ${missingEnvKeys.join(", ")}`);
        summary = "Zoom sync ceka setup kredencijala.";
      } else {
        details.push(
          `Pronadjeno zakazanih sastanaka za sync: ${upcomingMeetings.length}.`,
        );
        upcomingMeetings.slice(0, 3).forEach((meeting) => {
          meeting.summary =
            "Zoom termin je potvrdjen. Posle sastanka recording i AI tok mogu da dopune karticu klijenta.";
        });
        summary = "Zoom metadata sync je osvezen za zakazane sastanke.";
      }
    }

    if (input.integrationId === "drive" && client) {
      if (missingEnvKeys.length) {
        details.push(`Nedostaju kljucevi: ${missingEnvKeys.join(", ")}`);
        summary = "Drive sync ceka setup kredencijala.";
      } else {
        client.meetings = client.meetings.map((meeting) => ({
          ...meeting,
          recording: {
            ...meeting.recording,
            driveFolderUrl:
              meeting.recording.driveFolderUrl === "#"
                ? `${client.driveRootUrl}/meetings/${meeting.id}`
                : meeting.recording.driveFolderUrl,
            materialsUrl:
              meeting.recording.materialsUrl === "#"
                ? `${client.driveRootUrl}/materials/${meeting.id}`
                : meeting.recording.materialsUrl,
            recordingsUrl:
              meeting.recording.recordingsUrl === "#"
                ? `${client.driveRootUrl}/recordings/${meeting.id}`
                : meeting.recording.recordingsUrl,
          },
        }));
        details.push("Drive putanje po sastancima su osvezene.");
        summary = "Drive lokacije su osvezene za klijenta.";
      }
    }

    if (input.integrationId === "openai" && client) {
      const pendingMeetings = client.meetings.filter(
        (meeting) => meeting.status !== "Zakazan" && !meeting.aiSummaryReady,
      );
      if (missingEnvKeys.length) {
        details.push(`Nedostaju kljucevi: ${missingEnvKeys.join(", ")}`);
        summary = "OpenAI sync ceka setup API kljuca.";
      } else {
        details.push(`Sastanci spremni za AI obradu: ${pendingMeetings.length}.`);
        summary = "OpenAI pipeline je spreman za obradu dostupnih audio i transcript signala.";
      }
    }

    if (input.integrationId === "email" && client) {
      const pendingQueue = getPendingAutomationQueue([client], draft.automationDispatchLog);
      if (missingEnvKeys.length) {
        details.push(`Nedostaju kljucevi: ${missingEnvKeys.join(", ")}`);
        summary = "Email automation ceka setup provider kljuceva.";
      } else {
        details.push(`Pending email stavki u queue-u: ${pendingQueue.length}.`);
        summary = "Email automation je spreman i queue je osvezen.";
      }
    }

    if (status === "Uspeh" && missingEnvKeys.length) {
      status = "Ceka setup";
    }

    draft.integrationRuns = [
      buildIntegrationRun({
        integrationId: input.integrationId,
        clientId: client?.id,
        clientName: client?.name,
        status,
        startedAt: now,
        finishedAt: now,
        summary,
        details,
      }),
      ...draft.integrationRuns,
    ].slice(0, 40);

    rebuildStaffClientIndex(draft);
    return draft;
  });
}

export async function dispatchAutomation(input: DispatchAutomationInput) {
  return updateAppData((draft) => {
    const queue = getPendingAutomationQueue(draft.clients, draft.automationDispatchLog);
    const item = queue.find((entry) => entry.id === input.queueItemId);
    if (!item) {
      throw new Error("Automation stavka vise nije dostupna za slanje.");
    }

    const missingEnvKeys = getMissingEnvKeys("email");
    const sentAt = new Date().toISOString();
    const status: AutomationDispatchLog["status"] = missingEnvKeys.length
      ? "Ceka setup"
      : "Poslato";
    const summary = missingEnvKeys.length
      ? `${item.summary} / email provider nije povezan`
      : `${item.summary} / email je oznacen kao poslat iz outbox-a`;

    draft.automationDispatchLog = [
      {
        id: buildId("automation-log", item.id),
        queueItemId: item.id,
        ruleId: item.ruleId,
        clientId: item.clientId,
        clientName: item.clientName,
        audience: item.audience,
        status,
        summary,
        sentAt,
      },
      ...draft.automationDispatchLog,
    ].slice(0, 80);

    if (status === "Poslato" && item.ruleId === "meeting-report" && item.relatedMeetingId) {
      const client = draft.clients.find((entry) => entry.id === item.clientId);
      const meeting = client?.meetings.find((entry) => entry.id === item.relatedMeetingId);
      if (meeting) {
        meeting.emailSentToClient = true;
      }
    }

    rebuildStaffClientIndex(draft);
    return draft;
  });
}
