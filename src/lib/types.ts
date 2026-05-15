export type ClientStatus = "Aktivan" | "Onboarding" | "Na cekanju";
export type RiskLevel = "Nizak" | "Srednji" | "Visok";
export type MeetingStatus = "Odrzan" | "Zakazan" | "Potreban follow-up";
export type JourneyStatus = "Zavrseno" | "U toku" | "Predstoji";
export type EmployeeRole = "consultant" | "manager";
export type ActorKind = "staff" | "client";
export type NavGroup = "work" | "personal" | "admin";
export type AssignmentResponsibility = "Lead" | "Support";
export type ClientSourceStatus = "Povezano" | "Rucno" | "Ceka sync";
export type ReportAudience = "Interno" | "Klijent" | "Interno + klijent";
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

export type IntegrationStatus = "Connected" | "Needs setup" | "Planned";

export type IntegrationBlueprint = {
  id: string;
  title: string;
  category: string;
  description: string;
  envKeys: string[];
  pulls: string[];
  pushes: string[];
  nextStep: string;
};

export type MeetingTemplate = {
  id: string;
  programId: string;
  title: string;
  type: string;
  durationMinutes: number;
  timingWindow: string;
  modules: string[];
  participants: string[];
  notes: string[];
};

export type ReminderRule = {
  id: string;
  label: string;
  trigger: string;
  audience: string;
  description: string;
};

export type ImportBlueprint = {
  id: string;
  title: string;
  formats: string[];
  columns: string[];
  notes: string[];
};

export type IntakeField = {
  id: string;
  label: string;
  required: boolean;
  owner: string;
  description: string;
};

export type EvidenceRequirement = {
  id: string;
  title: string;
  audience: string;
  description: string;
};

export type AutomationBlueprint = {
  id: string;
  title: string;
  trigger: string;
  audience: string;
  outputs: string[];
};

export type ProgramPlaybook = {
  programId: string;
  title: string;
  deliveryModel: string;
  meetingFlow: {
    id: string;
    title: string;
    timing: string;
    owner: string;
    description: string;
  }[];
  staffResponsibilities: string[];
  clientVisibility: string[];
  adminChecklist: string[];
  meetingCapture: EvidenceRequirement[];
  automations: AutomationBlueprint[];
};

export type BdpImportRow = {
  clientName: string;
  company: string;
  email: string;
  city: string;
  monthlyKickoffAt?: string;
  operationsAt?: string;
  financeAt?: string;
  hrLeadershipAt?: string;
};

export type MeetingAction = {
  id: string;
  title: string;
  owner: "Klijent" | "Konsultant";
  priority?: "Nizak" | "Srednji" | "Visok";
  completionPercent?: number;
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
  reportMeta?: MeetingReportMeta;
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
  assignments: ClientAssignment[];
  analytics: ClientAnalytics;
  revenueSnapshot: string;
  nextMilestone: string;
  sharedActionBoard: MeetingAction[];
  dataSources: ClientDataSource[];
  customerServiceNotes: CustomerServiceNote[];
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

export type ReportTemplate = {
  id: string;
  name: string;
  reportType: string;
  audience: ReportAudience;
  description: string;
  programIds: string[];
  prePrompt: string;
  prompt: string;
  outputSections: string[];
  excludedFields: string[];
};

export type SafeReportContext = {
  clientLabel: string;
  removedFields: string[];
  includedSignals: string[];
  promptPreview: string;
};

export type MeetingReportPreview = SummaryResult & {
  templateId: string;
  templateName: string;
  reportType: string;
  safeContext: SafeReportContext;
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

export type ClientAssignment = {
  consultantId: string;
  specialty: string;
  module: string;
  responsibility?: AssignmentResponsibility;
};

export type ClientDataSource = {
  id: "thinkific" | "ops-system" | "customer-service";
  label: string;
  status: ClientSourceStatus;
  externalId: string;
  owner: string;
  summary: string;
  metrics: string[];
  lastSyncedAt?: string;
};

export type CustomerServiceNote = {
  id: string;
  title: string;
  details: string;
  owner: string;
  updatedAt: string;
};

export type MeetingReportMeta = {
  templateId: string;
  templateName: string;
  reportType: string;
  expertOwnerId: string;
  safeClientLabel: string;
  excludedFields: string[];
  sourceIds: string[];
  savedAt: string;
};

export type AppData = {
  programs: Program[];
  staffUsers: StaffUser[];
  clients: Client[];
  clientPortalUsers: ClientPortalUser[];
  transferSuggestions: TransferSuggestion[];
  reportTemplates: ReportTemplate[];
};
