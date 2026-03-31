import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MeetingSummaryGenerator } from "@/components/meeting-summary-generator";
import { SectionCard } from "@/components/section-card";
import { StatusChip } from "@/components/status-chip";
import {
  getClientAiSummaryRate,
  getClientAllActions,
  getClientAssignedExperts,
  getClientLatestMeeting,
  getClientMeetingLoad,
  getClientNextMeeting,
  getClientOnTimeRate,
  getClientOpenActions,
  getMeetingModulesLabel,
  isTaskOverdue,
} from "@/lib/client-utils";
import { formatDate, formatDateTime } from "@/lib/formatting";
import { getClientById, getProgramById } from "@/lib/mock-data";
import { generateJourney } from "@/lib/journey";
import { MeetingAction, MeetingStatus } from "@/lib/types";

type ClientPageProps = {
  params: Promise<{ clientId: string }>;
};

function getRiskTone(risk: "Nizak" | "Srednji" | "Visok") {
  if (risk === "Visok") {
    return "danger";
  }
  if (risk === "Srednji") {
    return "warning";
  }
  return "success";
}

function getMeetingTone(status: MeetingStatus) {
  if (status === "Odrzan") {
    return "success";
  }
  if (status === "Potreban follow-up") {
    return "warning";
  }
  return "info";
}

function getActionTone(action: MeetingAction) {
  if (action.done) {
    return "success";
  }
  if (isTaskOverdue(action)) {
    return "danger";
  }
  if (action.reminderBeforeDue || action.reminderWhenOverdue) {
    return "warning";
  }
  return "neutral";
}

function ActionCard({ action }: { action: MeetingAction }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{action.title}</p>
          <p className="mt-1 text-sm text-muted">
            {action.owner} / rok {formatDateTime(action.dueDate)}
          </p>
        </div>
        <StatusChip
          label={
            action.done ? "Zavrseno" : isTaskOverdue(action) ? "Overdue" : "Otvoreno"
          }
          tone={getActionTone(action)}
        />
      </div>
      <p className="mt-3 text-sm text-muted">
        {action.sharedWithClient ? "Deljeno sa klijentom" : "Interna akcija"} /
        {action.reminderOnCreate ? " create email" : " bez create email-a"} /
        {action.reminderBeforeDue ? " reminder pre roka" : " bez pre-roka"} /
        {action.reminderWhenOverdue ? " overdue reminder" : " bez overdue slanja"}
      </p>
    </div>
  );
}

export async function generateMetadata({
  params,
}: ClientPageProps): Promise<Metadata> {
  const { clientId } = await params;
  const client = getClientById(clientId);

  if (!client) {
    return {
      title: "Klijent nije pronadjen",
    };
  }

  return {
    title: `${client.name} | VLAH Consultant Hub`,
    description: `Pregled klijenta ${client.name}, programa, modula, sastanaka i konsultantskih beleznica.`,
  };
}

export default async function ClientDetailsPage({ params }: ClientPageProps) {
  const { clientId } = await params;
  const client = getClientById(clientId);

  if (!client) {
    notFound();
  }

  const program = getProgramById(client.programId);
  const journey = program ? generateJourney(client, program) : [];
  const latestMeeting = getClientLatestMeeting(client);
  const nextMeeting = getClientNextMeeting(client);
  const assignments = getClientAssignedExperts(client);
  const meetingLoad = getClientMeetingLoad(client);
  const openActions = getClientOpenActions(client);
  const actionBoard = getClientAllActions(client);
  const aiCoverage = getClientAiSummaryRate(client);
  const onTimeRate = getClientOnTimeRate(client);

  return (
    <AppShell>
      <main className="grid gap-6">
        <SectionCard
          eyebrow="Client profile"
          title={client.name}
          description={`${client.company} / ${client.city} / ${client.email}`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip label={client.status} tone="success" />
            <StatusChip
              label={`Rizik: ${client.riskLevel}`}
              tone={getRiskTone(client.riskLevel)}
            />
            <StatusChip label={client.stage} tone="info" />
            <StatusChip label={program?.name ?? "Program"} tone="neutral" />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="brand-item p-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#ff946d]">
                    Program
                  </p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {program?.name}
                  </p>
                  <p className="mt-2 text-sm text-muted">{program?.cadence}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {client.programModules.map((module) => (
                      <StatusChip key={module} label={module} tone="neutral" />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[#ff946d]">
                    Drive i tracking
                  </p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    Root folder spreman
                  </p>
                  <p className="mt-2 text-sm text-muted">{client.driveRootUrl}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <p className="text-sm text-muted">Start programa</p>
                  <p className="mt-2 font-semibold text-foreground">
                    {formatDate(client.startDate)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <p className="text-sm text-muted">Sledeci sastanak</p>
                  <p className="mt-2 font-semibold text-foreground">
                    {nextMeeting
                      ? formatDateTime(nextMeeting.scheduledStartAt)
                      : "Nije zakazan"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <p className="text-sm text-muted">Meeting load</p>
                  <p className="mt-2 font-semibold text-foreground">
                    {meetingLoad.total} / target {client.meetingAverageTarget}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <p className="text-sm text-muted">Otvorene akcije</p>
                  <p className="mt-2 font-semibold text-foreground">
                    {openActions.length}
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <p className="text-sm text-muted">AI coverage</p>
                  <p className="mt-2 font-semibold text-foreground">
                    {aiCoverage}%
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <p className="text-sm text-muted">Client on-time</p>
                  <p className="mt-2 font-semibold text-foreground">
                    {onTimeRate}%
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <p className="text-sm text-muted">Prihod snapshot</p>
                  <p className="mt-2 font-semibold text-foreground">
                    {client.revenueSnapshot}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-border bg-panel-strong p-5">
              <p className="text-sm font-semibold text-foreground">
                Dodeljeni eksperti i fokus
              </p>
              <div className="mt-4 grid gap-3">
                {assignments.map(({ assignment, consultant }) => (
                  <div
                    key={`${client.id}-${assignment.module}`}
                    className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3"
                  >
                    <p className="font-semibold text-foreground">
                      {assignment.module}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {consultant.name} / {assignment.specialty}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-2xl border border-white/8 bg-white/4 p-4">
                <p className="text-sm font-semibold text-foreground">
                  Najvazniji cilj ovog ciklusa
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {client.monthlyGoal}
                </p>
                <p className="mt-3 text-sm leading-6 text-muted">{client.notes}</p>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {client.tags.map((tag) => (
                  <StatusChip key={tag} label={tag} tone="neutral" />
                ))}
              </div>

              <div className="mt-5">
                <Link
                  href="/clients"
                  className="text-sm font-semibold text-accent underline underline-offset-4"
                >
                  Nazad na bazu klijenata
                </Link>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Journey"
          title="Automatski generisan put klijenta kroz program"
          description="Journey i dalje dolazi iz programskih settings-a, ali sada je direktno uskladjen sa Master Mind i BDP pravilima."
        >
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            {journey.map((step) => (
              <div
                key={step.id}
                className="rounded-[24px] border border-border bg-panel-strong p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-base font-semibold text-foreground">
                    {step.title}
                  </p>
                  <StatusChip
                    label={step.status}
                    tone={
                      step.status === "Zavrseno"
                        ? "success"
                        : step.status === "U toku"
                          ? "info"
                          : "neutral"
                    }
                  />
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {step.outcome}
                </p>
                <p className="mt-4 text-sm font-medium text-foreground">
                  {formatDate(step.startDate)} - {formatDate(step.endDate)}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <SectionCard
            eyebrow="Meetings"
            title="Istorija sastanaka"
            description="Svaki sastanak sada cuva pun operativni trag: planirano i stvarno vreme, punctuality, AI summary i drive lokacije."
          >
            <div className="grid gap-4">
              {client.meetings.map((meeting) => (
                <div key={meeting.id} className="brand-item p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        {meeting.title}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {meeting.type} / {getMeetingModulesLabel(meeting)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusChip
                        label={meeting.status}
                        tone={getMeetingTone(meeting.status)}
                      />
                      <StatusChip
                        label={meeting.clientOnTime ? "On time" : "Kasnio"}
                        tone={meeting.clientOnTime ? "success" : "warning"}
                      />
                      <StatusChip
                        label={meeting.overran ? "Produzen" : "Na vreme"}
                        tone={meeting.overran ? "warning" : "neutral"}
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-muted md:grid-cols-2 xl:grid-cols-4">
                    <p>Planirano: {formatDateTime(meeting.scheduledStartAt)}</p>
                    <p>Stvarni start: {formatDateTime(meeting.actualStartAt)}</p>
                    <p>Kraj: {formatDateTime(meeting.endedAt)}</p>
                    <p>Trajanje: {meeting.durationMinutes} min</p>
                  </div>

                  <p className="mt-4 text-sm leading-6 text-muted">
                    {meeting.summary}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {meeting.participants.map((participant) => (
                      <StatusChip
                        key={`${meeting.id}-${participant}`}
                        label={participant}
                        tone="neutral"
                      />
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 text-sm">
                    <a
                      href={meeting.recording.videoUrl}
                      className="brand-button-secondary"
                    >
                      Video
                    </a>
                    <a
                      href={meeting.recording.audioUrl}
                      className="brand-button-secondary"
                    >
                      Audio
                    </a>
                    <a
                      href={meeting.recording.driveFolderUrl}
                      className="brand-button-secondary"
                    >
                      Drive folder
                    </a>
                    <a
                      href={meeting.recording.materialsUrl}
                      className="brand-button-secondary"
                    >
                      Materijali
                    </a>
                    <a
                      href={meeting.recording.recordingsUrl}
                      className="brand-button-secondary"
                    >
                      Snimci
                    </a>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <StatusChip
                      label={
                        meeting.emailSentToClient ? "Email sent" : "Email pending"
                      }
                      tone={meeting.emailSentToClient ? "success" : "warning"}
                    />
                    <StatusChip
                      label={
                        meeting.aiSummaryReady ? "AI summary ready" : "AI pending"
                      }
                      tone={meeting.aiSummaryReady ? "info" : "neutral"}
                    />
                  </div>

                  <div className="mt-5">
                    <p className="text-sm font-semibold text-foreground">
                      Action items
                    </p>
                    <div className="mt-3 grid gap-3">
                      {meeting.actions.length ? (
                        meeting.actions.map((action) => (
                          <ActionCard key={action.id} action={action} />
                        ))
                      ) : (
                        <p className="text-sm text-muted">
                          Za ovaj sastanak jos nema dodatih akcija.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          <div className="grid gap-6">
            <SectionCard
              eyebrow="Documentation"
              title="Drive, dokumenti i deljeni board"
              description="Ovde su podeljeni folderi, dokumentacija i taskovi koji ostaju vidljivi timu i klijentu."
            >
              <div className="grid gap-4">
                <div className="rounded-[24px] border border-border bg-panel-strong p-5">
                  <p className="text-sm font-semibold text-foreground">
                    Root drive folder
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    {client.driveRootUrl}
                  </p>
                </div>

                <div className="rounded-[24px] border border-border bg-panel-strong p-5">
                  <p className="text-sm font-semibold text-foreground">
                    Dokumentacija
                  </p>
                  <div className="mt-4 space-y-3">
                    {client.documents.map((document) => (
                      <div
                        key={document.id}
                        className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3"
                      >
                        <p className="font-semibold text-foreground">
                          {document.name}
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          {document.type} / {document.status}
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          Owner: {document.owner} / update{" "}
                          {formatDateTime(document.lastUpdated)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-border bg-panel-strong p-5">
                  <p className="text-sm font-semibold text-foreground">
                    Deljeni resursi
                  </p>
                  <div className="mt-4 space-y-3">
                    {client.resources.map((resource) => (
                      <div
                        key={resource.id}
                        className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3"
                      >
                        <p className="font-semibold text-foreground">
                          {resource.title}
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          {resource.category} / poslato{" "}
                          {formatDate(resource.lastShared)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-border bg-panel-strong p-5">
                  <p className="text-sm font-semibold text-foreground">
                    {client.sharedActionBoard.length
                      ? "Shared action board"
                      : "Otvorene akcije"}
                  </p>
                  <div className="mt-4 grid gap-3">
                    {actionBoard.length ? (
                      actionBoard.map((action) => (
                        <ActionCard key={action.id} action={action} />
                      ))
                    ) : (
                      <p className="text-sm text-muted">
                        Trenutno nema otvorenih taskova za prikaz.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="AI workflow"
              title="Demo summary generator"
              description="Ovaj ekran pokazuje kako ce kasnije srpski audio sa sastanka da zavrsi u strukturisanim beleznicama."
            >
              <MeetingSummaryGenerator
                clientName={client.name}
                meetingTitle={latestMeeting?.title ?? "Poslednji sastanak"}
                defaultTranscript={
                  latestMeeting?.transcriptPreview ??
                  "Klijent je podelio status projekta i dogovoreni su sledeci koraci."
                }
              />
            </SectionCard>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
