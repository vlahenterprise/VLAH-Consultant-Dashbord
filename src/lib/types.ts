export type ClientStatus = "Aktivan" | "Onboarding" | "Na cekanju";
export type RiskLevel = "Nizak" | "Srednji" | "Visok";
export type MeetingStatus = "Odrzan" | "Zakazan" | "Potreban follow-up";
export type JourneyStatus = "Zavrseno" | "U toku" | "Predstoji";
export type EmployeeRole = "consultant" | "manager";
export type ActorKind = "staff" | "client";
export type NavGroup = "work" | "personal" | "admin";
export type WorkspaceSection =
  | "overview"
  | "clients"
  | "analytics"
  | "programs"
  | "team"
  | "admin"
  | "meetings"
  | "resources";
export type ChipTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "accent";

export type ProgramPhase = {
  id: string;
  title: string;
  durationWeeks: number;
  outcome: string;
};

export type Program = {
  id: string;
  name: string;
  category: string;
  modules: string[];
  targetProfile: string;
  cadence: string;
  durationWeeks: number;
  meetingTarget?: string;
  workflowNotes: string[];
  phases: ProgramPhase[];
};

export type MeetingAction = {
  id: string;
  title: string;
  owner: "Klijent" | "Konsultant";
  dueDate: string;
  done: boolean;
  sharedWithClient: boolean;
  reminderBeforeDue: boolean;
  reminderWhenOverdue: boolean;
  reminderOnCreate: boolean;
};

export type Meeting = {
  id: string;
  title: string;
  date: string;
  scheduledStartAt: string;
  actualStartAt: string;
  endedAt: string;
  durationMinutes: number;
  type: string;
  modules: string[];
  participants: string[];
  status: MeetingStatus;
  clientOnTime: boolean;
  overran: boolean;
  emailSentToClient: boolean;
  aiSummaryReady: boolean;
  summary: string;
  transcriptPreview: string;
  actions: MeetingAction[];
  recording: {
    videoUrl: string;
    audioUrl: string;
    driveFolderUrl: string;
    materialsUrl: string;
    recordingsUrl: string;
  };
};

export type ClientDocument = {
  id: string;
  name: string;
  type: string;
  status: string;
  lastUpdated: string;
  owner: string;
};

export type ClientResource = {
  id: string;
  title: string;
  category: string;
  lastShared: string;
};

export type ClientAnalytics = {
  healthScore: number;
  actionCompletion: number;
  meetingConsistency: number;
  satisfactionScore: number;
  revenueDelta: number;
  milestoneProgress: number;
};

export type Client = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  city: string;
  timezone: string;
  startDate: string;
  status: ClientStatus;
  stage: string;
  riskLevel: RiskLevel;
  monthlyGoal: string;
  notes: string;
  tags: string[];
  programId: string;
  consultantId: string;
  managerId: string;
  programModules: string[];
  meetingAverageTarget: number;
  driveRootUrl: string;
  assignments: {
    consultantId: string;
    specialty: string;
    module: string;
  }[];
  analytics: ClientAnalytics;
  revenueSnapshot: string;
  nextMilestone: string;
  sharedActionBoard: MeetingAction[];
  documents: ClientDocument[];
  resources: ClientResource[];
  meetings: Meeting[];
};

export type StaffUser = {
  kind: "staff";
  id: string;
  name: string;
  email: string;
  title: string;
  role: EmployeeRole;
  adminAddon: boolean;
  team: string;
  focus: string;
  specialties: string[];
  nextAvailableSlot: string;
  activeClientIds: string[];
  directReportIds?: string[];
  dashboard: {
    weeklyMeetings: number;
    openActions: number;
    pendingSummaries: number;
    utilization: number;
    clientSatisfaction: number;
  };
};

export type ClientPortalUser = {
  kind: "client";
  id: string;
  clientId: string;
  name: string;
  email: string;
  company: string;
  portalLabel: string;
};

export type WorkspaceActor = StaffUser | ClientPortalUser;

export type JourneyStep = {
  id: string;
  title: string;
  outcome: string;
  startDate: string;
  endDate: string;
  status: JourneyStatus;
};

export type SummaryResult = {
  overview: string;
  keyPoints: string[];
  actionItems: string[];
  riskFlags: string[];
  suggestedFollowUp: string;
};

export type NavigationItem = {
  group: NavGroup;
  label: string;
  href: string;
  badge?: string;
};

export type TransferSuggestion = {
  id: string;
  clientId: string;
  fromConsultantId: string;
  toConsultantId: string;
  requestedBy: string;
  status: "Predlog" | "Hitno" | "Spremno";
  reason: string;
};
