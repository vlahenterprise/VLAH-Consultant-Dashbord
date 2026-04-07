import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { MeetingSummaryGenerator } from "@/components/meeting-summary-generator";
import { SectionCard } from "@/components/section-card";
import { StatusChip } from "@/components/status-chip";
import {
  getActionCompletionPercent,
  getActionPriority,
  getClientActionBoardStats,
  getClientAiSummaryRate,
  getClientAllActions,
  getClientAssignedExperts,
  getClientLatestMeeting,
  getClientMeetingBreakdown,
  getClientMeetingComplianceStats,
  getClientMeetingLoad,
  getClientNextMeeting,
  getClientOnTimeRate,
  getClientOpenActions,
  getMeetingModulesLabel,
  isTaskOverdue,
} from "@/lib/client-utils";
import { getClientById, getProgramById, loadAppData } from "@/lib/app-data";
import { formatDate, formatDateTime } from "@/lib/formatting";
import { getProgramPlaybook } from "@/lib/operating-model";
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
        {" "}prioritet {getActionPriority(action)} /
        {" "}{getActionCompletionPercent(action)}% zavrseno /
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
  const data = await loadAppData();
  const client = getClientById(data, clientId);

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
  const data = await loadAppData();
  const client = getClientById(data, clientId);

  if (!client) {
    notFound();
  }

  const program = getProgramById(data, client.programId);
  const journey = program ? generateJourney(client, program) : [];
  const latestMeeting = getClientLatestMeeting(client);
  const nextMeeting = getClientNextMeeting(client);
  const assignments = getClientAssignedExperts(data, client);
  const meetingLoad = getClientMeetingLoad(client);
  const openActions = getClientOpenActions(client);
  const actionBoard = getClientAllActions(client);
  const aiCoverage = getClientAiSummaryRate(client);
  const onTimeRate = getClientOnTimeRate(client);
  const playbook = getProgramPlaybook(client.programId);
  const actionStats = getClientActionBoardStats(client);
  const meetingBreakdown = getClientMeetingBreakdown(client);
  const complianceStats = getClientMeetingComplianceStats(client);

  return (
    <AppShell>
      <main className="grid gap-6">
        <SectionCard
          eyebrow="Klijent"
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
                  <p className="text-sm text-muted">Sastanci</p>
                  <p className="mt-2 font-semibold text-foreground">
                    {meetingLoad.total} / norma {client.meetingAverageTarget}
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
                  <p className="text-sm text-muted">Izvestaji</p>
                  <p className="mt-2 font-semibold text-foreground">
                    {aiCoverage}%
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                  <p className="text-sm text-muted">Dolazak na vreme</p>
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

        {playbook ? (
          <SectionCard
            eyebrow="Program"
            title={playbook.title}
            description="Tok rada, odgovorni ljudi i sastanci za ovaj program."
          >
            <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="brand-item p-5">
                <p className="text-sm font-semibold text-foreground">
                  Tok rada
                </p>
                <p className="mt-3 text-sm leading-7 text-muted">
                  {playbook.deliveryModel}
                </p>

                <div className="mt-5 grid gap-3">
                  {playbook.meetingFlow.map((step) => (
                    <div
                      key={step.id}
                      className="rounded-[20px] border border-white/8 bg-white/4 px-4 py-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="font-semibold text-foreground">{step.title}</p>
                        <StatusChip label={step.timing} tone="neutral" />
                      </div>
                      <p className="mt-2 text-sm text-muted">{step.owner}</p>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        {step.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                <div className="brand-item p-5">
                  <p className="text-sm font-semibold text-foreground">
                    Izvrsenje i disciplina
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                      <p className="text-sm text-muted">Ukupno akcija</p>
                      <p className="mt-2 font-semibold text-foreground">
                        {actionStats.total}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                      <p className="text-sm text-muted">Completion rate</p>
                      <p className="mt-2 font-semibold text-foreground">
                        {actionStats.completionRate}%
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                      <p className="text-sm text-muted">Shared with client</p>
                      <p className="mt-2 font-semibold text-foreground">
                        {actionStats.shared}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
                      <p className="text-sm text-muted">Overdue</p>
                      <p className="mt-2 font-semibold text-foreground">
                        {actionStats.overdue}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="brand-item p-5">
                  <p className="text-sm font-semibold text-foreground">
                    Breakdown sastanaka
                  </p>
                  <div className="mt-4 grid gap-3">
                    {meetingBreakdown.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-foreground">{item.label}</p>
                          <StatusChip label={String(item.count)} tone="accent" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>
        ) : null}

        <SectionCard
          eyebrow="Plan"
          title="Put kroz program"
          description="Faze rada i ocekivani ishod po fazi."
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
            eyebrow="Sastanci"
            title="Istorija sastanaka"
            description="Vreme, prisustvo, trajanje, izvestaj, akcije i Drive linkovi."
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
                        label={meeting.clientOnTime ? "Na vreme" : "Kasnio"}
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
                        meeting.emailSentToClient ? "Email poslat" : "Email ceka"
                      }
                      tone={meeting.emailSentToClient ? "success" : "warning"}
                    />
                    <StatusChip
                      label={
                        meeting.aiSummaryReady ? "Izvestaj spreman" : "Izvestaj ceka"
                      }
                      tone={meeting.aiSummaryReady ? "info" : "neutral"}
                    />
                  </div>

                  <div className="mt-5">
                    <p className="text-sm font-semibold text-foreground">
                      Akcije
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
              eyebrow="Evidencija"
              title="Kontrola sastanaka"
              description="Odrzano, kasnjenje, produzenje, email i izvestaj."
            >
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[24px] border border-border bg-panel-strong p-5">
                  <p className="text-sm text-muted">Odrzani</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {complianceStats.held}
                  </p>
                </div>
                <div className="rounded-[24px] border border-border bg-panel-strong p-5">
                  <p className="text-sm text-muted">Potreban follow-up</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {complianceStats.followUp}
                  </p>
                </div>
                <div className="rounded-[24px] border border-border bg-panel-strong p-5">
                  <p className="text-sm text-muted">Kasnjenja klijenta</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {complianceStats.late}
                  </p>
                </div>
                <div className="rounded-[24px] border border-border bg-panel-strong p-5">
                  <p className="text-sm text-muted">Produzeni sastanci</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {complianceStats.overran}
                  </p>
                </div>
                <div className="rounded-[24px] border border-border bg-panel-strong p-5">
                  <p className="text-sm text-muted">Email report poslat</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {complianceStats.emailSent}
                  </p>
                </div>
                <div className="rounded-[24px] border border-border bg-panel-strong p-5">
                  <p className="text-sm text-muted">Izvestaj spreman</p>
                  <p className="mt-2 text-xl font-semibold text-foreground">
                    {complianceStats.aiReady}
                  </p>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              eyebrow="Dokumenti"
              title="Drive, dokumenti i jedinstvena akciona tabla"
              description="Materijali, snimci, dokumenti i taskovi za klijenta."
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
                      ? "Zajednicka action lista"
                      : "Akciona tabla za klijenta"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Ovde se vide prioritet, procenat zavrsenja, due date i reminder logika za svaki task.
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
              eyebrow="Izvestaj"
              title="Generator izvestaja"
              description="Srpski transkript sastanka pretvara se u kratak izvestaj i akcije."
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
