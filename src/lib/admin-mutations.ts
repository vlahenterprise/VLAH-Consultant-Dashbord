import { getMeetingTemplatesForProgram } from "@/lib/admin-blueprints";
import {
  getProgramById,
  updateAppData,
} from "@/lib/app-data";
import {
  AppData,
  BdpImportRow,
  Client,
  EmployeeRole,
  Meeting,
  MeetingTemplate,
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
      "Summary ce biti generisan posle odrzanog sastanka i obrade audio transkripta.",
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
    };
  });
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
    portalLabel: `${client.company} portal`,
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
        ? "Pokrenuti prvi mesecni 3:1 i povezati shared action board."
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

    draft.staffUsers = draft.staffUsers.map((staff) =>
      client.assignments.some((assignment) => assignment.consultantId === staff.id)
        ? {
            ...staff,
            activeClientIds: Array.from(
              new Set([client.id, ...staff.activeClientIds]),
            ),
          }
        : staff,
    );

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

        draft.staffUsers = draft.staffUsers.map((staff) =>
          targetClient.assignments.some(
            (assignment) => assignment.consultantId === staff.id,
          )
            ? {
                ...staff,
                activeClientIds: Array.from(
                  new Set([targetClient.id, ...staff.activeClientIds]),
                ),
              }
            : staff,
        );
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

    return draft;
  });
}
