import Link from "next/link";
import { AdminSetupPanel } from "@/components/admin-setup-panel";
import { MeetingSummaryGenerator } from "@/components/meeting-summary-generator";
import { SectionCard } from "@/components/section-card";
import { StatusChip } from "@/components/status-chip";
import {
  importBlueprints,
  integrationBlueprints,
  meetingTemplates,
  reminderRules,
} from "@/lib/admin-blueprints";
import { getProgramPlaybook } from "@/lib/operating-model";
import {
  getActionCompletionPercent,
  getActionPriority,
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
import {
  getClientById,
  getClientsForConsultant,
  getConsultantById,
  getManagedConsultants,
  getProgramById,
  getVisibleClientsForActor,
} from "@/lib/app-data";
import {
  formatDate,
  formatDateTime,
  formatPercent,
  formatSignedPercent,
} from "@/lib/formatting";
import {
  AppData,
  Client,
  MeetingAction,
  MeetingStatus,
  StaffUser,
  WorkspaceActor,
  WorkspaceSection,
} from "@/lib/types";
import { canAccessAdmin, canTransferClients } from "@/lib/permissions";

function getRiskTone(risk: Client["riskLevel"]) {
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

function getWorkflowLabel(client: Client) {
  return client.programId === "bdp"
    ? "Mesecni 3:1 kickoff, pa kraj-meseca individualni review-i."
    : "Zajednicki kickoff, pa odvojeni 1:1 tokovi za profitabilnost i organizaciju.";
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="brand-kpi">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-foreground">{value}</p>
      <p className="mt-2 text-sm text-muted">{hint}</p>
    </div>
  );
}

function MiniBars({
  items,
}: {
  items: { label: string; value: number; valueLabel: string }[];
}) {
  return (
    <div className="mini-bars">
      {items.map((item) => (
        <div key={item.label} className="mini-bar-row">
          <div className="mini-bar-head">
            <span>{item.label}</span>
            <span>{item.valueLabel}</span>
          </div>
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${Math.max(6, Math.min(100, item.value))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function ExpertAssignments({
  data,
  client,
  compact = false,
}: {
  data: AppData;
  client: Client;
  compact?: boolean;
}) {
  const experts = getClientAssignedExperts(data, client);

  return (
    <div className={compact ? "mt-3 flex flex-wrap gap-2" : "mt-4 grid gap-3"}>
      {experts.map(({ assignment, consultant }) => (
        <div
          key={`${client.id}-${assignment.module}`}
          className={
            compact
              ? "rounded-full border border-white/10 bg-white/4 px-3 py-2 text-xs text-muted"
              : "rounded-[18px] border border-white/8 bg-white/4 px-4 py-3"
          }
        >
          <p className={compact ? "font-semibold text-foreground" : "text-sm font-semibold text-foreground"}>
            {assignment.module}
          </p>
          <p className={compact ? "mt-1 text-[11px]" : "mt-1 text-sm text-muted"}>
            {consultant.name} / {assignment.specialty}
          </p>
        </div>
      ))}
    </div>
  );
}

function OpenActionPreview({
  action,
  clientName,
}: {
  action: MeetingAction;
  clientName?: string;
}) {
  return (
    <div className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{action.title}</p>
          <p className="mt-1 text-sm text-muted">
            {clientName ? `${clientName} / ` : ""}
            {action.owner} / rok {formatDateTime(action.dueDate)}
          </p>
        </div>
        <StatusChip
          label={
            action.done
              ? "Zavrseno"
              : isTaskOverdue(action)
                ? "Overdue"
                : "Aktivno"
          }
          tone={getActionTone(action)}
        />
      </div>
      <p className="mt-3 text-sm text-muted">
        {action.sharedWithClient ? "Deljeno sa klijentom" : "Interna akcija"} /
        {" "}prioritet {getActionPriority(action)} /
        {" "}{getActionCompletionPercent(action)}% zavrseno /
        {action.reminderOnCreate ? " email na kreiranje" : " bez create email-a"} /
        {action.reminderBeforeDue ? " reminder pre roka" : " bez pre-roka"} /
        {action.reminderWhenOverdue ? " overdue reminder" : " bez overdue slanja"}
      </p>
    </div>
  );
}

function StaffOverview({
  actor,
  data,
}: {
  actor: StaffUser;
  data: AppData;
}) {
  const visibleClients = getVisibleClientsForActor(data, actor);
  const openActions = visibleClients.flatMap((client) =>
    getClientOpenActions(client).map((action) => ({ action, client })),
  );
  const upcomingMeetings = visibleClients
    .map((client) => ({
      client,
      meeting: getClientNextMeeting(client),
    }))
    .filter(
      (
        entry,
      ): entry is {
        client: Client;
        meeting: NonNullable<ReturnType<typeof getClientNextMeeting>>;
      } => Boolean(entry.meeting),
    )
    .sort(
      (left, right) =>
        new Date(left.meeting.scheduledStartAt).getTime() -
        new Date(right.meeting.scheduledStartAt).getTime(),
    );
  const atRiskClients = visibleClients.filter(
    (client) => client.riskLevel !== "Nizak",
  );
  const pendingAiSummaries = visibleClients.reduce(
    (sum, client) =>
      sum +
      client.meetings.filter(
        (meeting) => meeting.status !== "Zakazan" && !meeting.aiSummaryReady,
      ).length,
    0,
  );
  const masterMindCount = visibleClients.filter(
    (client) => client.programId === "master-mind",
  ).length;
  const bdpCount = visibleClients.filter((client) => client.programId === "bdp")
    .length;

  return (
    <>
      <SectionCard
        eyebrow="Workspace"
        title={`${actor.name} dashboard`}
        description="Sada je dashboard vezan za stvarni Master Mind i BDP nacin rada, sa modulima, shared task board-om i meeting compliance signalima."
      >
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="brand-item p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap gap-2">
                  <StatusChip
                    label={actor.role === "manager" ? "Manager" : "Consultant"}
                    tone="accent"
                  />
                  {actor.adminAddon ? (
                    <StatusChip label="Admin add-on" tone="info" />
                  ) : null}
                  {actor.specialties.map((specialty) => (
                    <StatusChip key={specialty} label={specialty} tone="neutral" />
                  ))}
                </div>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                  {actor.title}
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                  {actor.focus}
                </p>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-white/4 px-4 py-3 text-sm text-muted">
                <p>Sledeci slobodan slot</p>
                <p className="mt-2 font-semibold text-foreground">
                  {formatDateTime(actor.nextAvailableSlot)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Klijenti"
                value={String(visibleClients.length)}
                hint={`${masterMindCount} Master Mind / ${bdpCount} BDP`}
              />
              <MetricCard
                label="Sastanci"
                value={String(actor.dashboard.weeklyMeetings)}
                hint="ove nedelje"
              />
              <MetricCard
                label="AI summaries"
                value={String(pendingAiSummaries)}
                hint="cekaju transcript/sumarizaciju"
              />
              <MetricCard
                label="Utilizacija"
                value={formatPercent(actor.dashboard.utilization)}
                hint="kapacitet konsultanta"
              />
            </div>
          </div>

          <div className="brand-item p-5">
            <p className="text-sm font-semibold text-foreground">
              Pravila pristupa i operativni tok
            </p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-muted">
              <p>
                {actor.role === "manager"
                  ? "Manager vidi portfolio celog tima i jedini moze da prebaci klijenta sa konsultanta na konsultanta."
                  : "Consultant vidi samo klijente na kojima je dodeljen makar jedan modul i unosi sastanke, izvestaje i drive linkove."}
              </p>
              <p>
                Master Mind pocinje zajednickim kickoff-om od 60 min, a zatim se
                rad deli na Profitabilnost i Organizaciju.
              </p>
              <p>
                BDP koristi mesecni 3:1 kickoff sa shared action board-om, reminder
                email-ovima i OpenAI summary flow-om iz srpskog audio transkripta.
              </p>
              <p>
                {actor.adminAddon
                  ? "Admin add-on ovde otvara program settings, AI/storage i access konfiguraciju."
                  : "Admin zona ostaje skrivena dok se add-on eksplicitno ne dodeli."}
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          eyebrow="Portfolio"
          title="Klijenti koje ova uloga vidi"
          description="Svaki profil sada pokazuje module, dodeljene eksperte, meeting target i operativni workflow po programu."
        >
          <div className="grid gap-3">
            {visibleClients.map((client) => {
              const program = getProgramById(data, client.programId);
              const nextMeeting = getClientNextMeeting(client);
              const meetingLoad = getClientMeetingLoad(client);

              return (
                <Link
                  key={client.id}
                  href={`/clients/${client.id}`}
                  className="brand-item block p-4 transition hover:-translate-y-0.5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-foreground">
                        {client.name}
                      </p>
                      <p className="text-sm text-muted">{client.company}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusChip
                        label={client.riskLevel}
                        tone={getRiskTone(client.riskLevel)}
                      />
                      <StatusChip label={client.status} tone="neutral" />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-muted md:grid-cols-2">
                    <p>Program: {program?.name}</p>
                    <p>Moduli: {client.programModules.join(" / ")}</p>
                    <p>
                      Sastanci: {meetingLoad.total} / target {client.meetingAverageTarget}
                    </p>
                    <p>
                      Sledeci sastanak:{" "}
                      {nextMeeting
                        ? formatDateTime(nextMeeting.scheduledStartAt)
                        : "nema zakazanog"}
                    </p>
                  </div>

                  <ExpertAssignments data={data} client={client} compact />
                </Link>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Focus"
          title="Sta trazi paznju ove nedelje"
          description="Objedinjeni signal iz meeting punctuality-ja, AI summary pipeline-a i shared/open taskova."
        >
          <div className="grid gap-4">
            <div className="brand-item p-4">
              <p className="text-sm font-semibold text-foreground">
                Klijenti sa povisenim rizikom
              </p>
              <div className="mt-3 space-y-3">
                {atRiskClients.length ? (
                  atRiskClients.map((client) => (
                    <div
                      key={client.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="font-semibold text-foreground">
                          {client.name}
                        </p>
                        <p className="text-sm text-muted">{client.nextMilestone}</p>
                      </div>
                      <StatusChip
                        label={client.riskLevel}
                        tone={getRiskTone(client.riskLevel)}
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted">
                    Nema klijenata sa povisenim rizikom.
                  </p>
                )}
              </div>
            </div>

            <div className="brand-item p-4">
              <p className="text-sm font-semibold text-foreground">
                Sledeci sastanci
              </p>
              <div className="mt-3 space-y-3">
                {upcomingMeetings.length ? (
                  upcomingMeetings.slice(0, 4).map(({ client, meeting }) => (
                    <div key={meeting.id}>
                      <p className="font-semibold text-foreground">
                        {meeting.title}
                      </p>
                      <p className="text-sm text-muted">
                        {client.name} / {formatDateTime(meeting.scheduledStartAt)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted">
                    Trenutno nema zakazanih sastanaka.
                  </p>
                )}
              </div>
            </div>

            <div className="brand-item p-4">
              <p className="text-sm font-semibold text-foreground">
                Otvorene akcije
              </p>
              <div className="mt-3 space-y-3">
                {openActions.length ? (
                  openActions.slice(0, 3).map(({ action, client }) => (
                    <OpenActionPreview
                      key={`${client.id}-${action.id}`}
                      action={action}
                      clientName={client.name}
                    />
                  ))
                ) : (
                  <p className="text-sm text-muted">
                    Sve akcije su trenutno zatvorene.
                  </p>
                )}
              </div>
            </div>
          </div>
        </SectionCard>
      </div>
    </>
  );
}

function StaffClients({
  actor,
  data,
}: {
  actor: StaffUser;
  data: AppData;
}) {
  const visibleClients = getVisibleClientsForActor(data, actor);

  return (
    <SectionCard
      eyebrow="Client base"
      title="CRM baza koju ova uloga vidi"
      description="Pregled je sada vezan za module, dodeljene eksperte, drive lokaciju i meeting normu po klijentu."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {visibleClients.map((client) => {
          const program = getProgramById(data, client.programId);
          const nextMeeting = getClientNextMeeting(client);
          const openActions = getClientOpenActions(client);
          const meetingLoad = getClientMeetingLoad(client);

          return (
            <Link
              key={client.id}
              href={`/clients/${client.id}`}
              className="brand-item block p-5 transition hover:-translate-y-0.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {client.name}
                  </p>
                  <p className="text-sm text-muted">{client.company}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusChip
                    label={`Rizik ${client.riskLevel}`}
                    tone={getRiskTone(client.riskLevel)}
                  />
                  <StatusChip label={client.stage} tone="neutral" />
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-muted md:grid-cols-2">
                <p>Program: {program?.name}</p>
                <p>Workflow: {getWorkflowLabel(client)}</p>
                <p>
                  Sastanci: {meetingLoad.total} / target {client.meetingAverageTarget}
                </p>
                <p>Open actions: {openActions.length}</p>
                <p>
                  Sledeci sastanak:{" "}
                  {nextMeeting
                    ? formatDateTime(nextMeeting.scheduledStartAt)
                    : "nema"}
                </p>
                <p>Drive hub: {client.driveRootUrl.replace("https://", "")}</p>
              </div>

              <ExpertAssignments data={data} client={client} />
            </Link>
          );
        })}
      </div>
    </SectionCard>
  );
}

function StaffAnalytics({
  actor,
  data,
}: {
  actor: StaffUser;
  data: AppData;
}) {
  const visibleClients = getVisibleClientsForActor(data, actor);
  const avgHealth =
    visibleClients.reduce((sum, client) => sum + client.analytics.healthScore, 0) /
      Math.max(1, visibleClients.length) || 0;
  const avgActionCompletion =
    visibleClients.reduce(
      (sum, client) => sum + client.analytics.actionCompletion,
      0,
    ) / Math.max(1, visibleClients.length);
  const avgMeetingConsistency =
    visibleClients.reduce(
      (sum, client) => sum + client.analytics.meetingConsistency,
      0,
    ) / Math.max(1, visibleClients.length);
  const avgMeetingLoad =
    visibleClients.reduce(
      (sum, client) => sum + getClientMeetingLoad(client).total,
      0,
    ) / Math.max(1, visibleClients.length);
  const avgAiCoverage =
    visibleClients.reduce((sum, client) => sum + getClientAiSummaryRate(client), 0) /
    Math.max(1, visibleClients.length);
  const clientsWithinTarget = visibleClients.filter(
    (client) => getClientMeetingLoad(client).total <= client.meetingAverageTarget,
  ).length;

  return (
    <>
      <SectionCard
        eyebrow="Analytics"
        title="User dashboard analytics"
        description="Analitika sada meri health, action completion, meeting target i koliko je OpenAI summary pipeline spreman po portfoliju."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Health"
            value={formatPercent(avgHealth)}
            hint="preko vidljivih klijenata"
          />
          <MetricCard
            label="Action completion"
            value={formatPercent(avgActionCompletion)}
            hint="realizacija taskova"
          />
          <MetricCard
            label="Meeting rhythm"
            value={formatPercent(avgMeetingConsistency)}
            hint="disciplina cadence-a"
          />
          <MetricCard
            label="AI coverage"
            value={formatPercent(avgAiCoverage)}
            hint="odrzani sastanci sa summary-jem"
          />
          <MetricCard
            label="Target fit"
            value={`${clientsWithinTarget}/${visibleClients.length}`}
            hint={`prosecno ${avgMeetingLoad.toFixed(1)} sastanka`}
          />
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          eyebrow="Client analytics"
          title="Health po klijentima"
          description="Pregled health score-a po svakom klijentu unutar vidljivog portfolija."
        >
          <MiniBars
            items={visibleClients.map((client) => ({
              label: client.name,
              value: client.analytics.healthScore,
              valueLabel: formatPercent(client.analytics.healthScore),
            }))}
          />
        </SectionCard>

        <SectionCard
          eyebrow="Execution"
          title="Meeting i summary disciplina"
          description="Poredi broj sastanaka, AI coverage i punctuality signal po klijentu."
        >
          <div className="grid gap-3">
            {visibleClients.map((client) => {
              const meetingLoad = getClientMeetingLoad(client);
              const targetRatio = Math.min(
                100,
                Math.round((meetingLoad.total / client.meetingAverageTarget) * 100),
              );

              return (
                <div key={client.id} className="brand-item p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-foreground">{client.name}</p>
                    <StatusChip
                      label={`${meetingLoad.total}/${client.meetingAverageTarget} sastanka`}
                      tone={
                        meetingLoad.total > client.meetingAverageTarget
                          ? "warning"
                          : "success"
                      }
                    />
                  </div>
                  <div className="mt-4">
                    <MiniBars
                      items={[
                        {
                          label: "Meeting target usage",
                          value: targetRatio,
                          valueLabel: `${meetingLoad.total}/${client.meetingAverageTarget}`,
                        },
                        {
                          label: "AI summary coverage",
                          value: getClientAiSummaryRate(client),
                          valueLabel: formatPercent(getClientAiSummaryRate(client)),
                        },
                        {
                          label: "Client on-time rate",
                          value: getClientOnTimeRate(client),
                          valueLabel: formatPercent(getClientOnTimeRate(client)),
                        },
                      ]}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </>
  );
}

function StaffPrograms({ data }: { data: AppData }) {
  return (
    <SectionCard
      eyebrow="Programs"
      title="Master Mind i BDP program setup"
      description="Za sada su modelovana samo ova dva programa, sa tacnim modulima, ritmovima i pravilima rada koje si definisao."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {data.programs.map((program) => {
          const enrolled = getProgramClientCount(data, program.id);
          const playbook = getProgramPlaybook(program.id);

          return (
            <div key={program.id} className="brand-item p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {program.name}
                  </p>
                  <p className="text-sm text-muted">{program.category}</p>
                </div>
                <StatusChip label={`${enrolled} klijenta`} tone="accent" />
              </div>

              <p className="mt-4 text-sm leading-6 text-muted">
                {program.targetProfile}
              </p>
              <p className="mt-3 text-sm text-muted">Ritam: {program.cadence}</p>
              {program.meetingTarget ? (
                <p className="mt-2 text-sm text-muted">
                  Norma: {program.meetingTarget}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {program.modules.map((module) => (
                  <StatusChip key={module} label={module} tone="neutral" />
                ))}
              </div>

              <div className="mt-5 grid gap-3">
                {program.workflowNotes.map((note) => (
                  <div
                    key={note}
                    className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-3"
                  >
                    <p className="text-sm leading-6 text-muted">{note}</p>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-3">
                {program.phases.map((phase) => (
                  <div
                    key={phase.id}
                    className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-3"
                  >
                    <p className="font-semibold text-foreground">
                      {phase.title}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      {phase.durationWeeks} ned. / {phase.outcome}
                    </p>
                  </div>
                ))}
              </div>

              {playbook ? (
                <div className="mt-5 grid gap-3">
                  <div className="rounded-[18px] border border-white/8 bg-black/12 px-4 py-4">
                    <p className="font-semibold text-foreground">
                      Delivery model
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {playbook.deliveryModel}
                    </p>
                  </div>
                  <div className="rounded-[18px] border border-white/8 bg-black/12 px-4 py-4">
                    <p className="font-semibold text-foreground">
                      Obavezni automations
                    </p>
                    <div className="mt-3 space-y-2 text-sm text-muted">
                      {playbook.automations.map((automation) => (
                        <p key={automation.id}>
                          - {automation.title}: {automation.trigger}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

function TeamSection({
  actor,
  data,
}: {
  actor: StaffUser;
  data: AppData;
}) {
  const consultants = getManagedConsultants(data, actor.id);

  return (
    <SectionCard
      eyebrow="Manager tools"
      title="Transfer centar i raspodela klijenata"
      description="Manager moze da prebacuje klijente izmedju konsultanata. Admin add-on to pravo ne daje."
    >
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="brand-item p-5">
          <p className="text-sm font-semibold text-foreground">
            Opterecenje konsultanata
          </p>
          <div className="mt-4 grid gap-3">
            {consultants.map((consultant) => {
              const consultantClients = getClientsForConsultant(
                data,
                consultant.id,
              );

              return (
                <div
                  key={consultant.id}
                  className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {consultant.name}
                      </p>
                      <p className="text-sm text-muted">{consultant.focus}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusChip
                        label={`${consultantClients.length} klijenata`}
                        tone="accent"
                      />
                      {consultant.adminAddon ? (
                        <StatusChip label="Admin add-on" tone="info" />
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {consultant.specialties.map((specialty) => (
                      <StatusChip key={specialty} label={specialty} tone="neutral" />
                    ))}
                  </div>
                  <div className="mt-4">
                    <MiniBars
                      items={[
                        {
                          label: "Utilizacija",
                          value: consultant.dashboard.utilization,
                          valueLabel: formatPercent(
                            consultant.dashboard.utilization,
                          ),
                        },
                        {
                          label: "CSAT",
                          value: consultant.dashboard.clientSatisfaction,
                          valueLabel: formatPercent(
                            consultant.dashboard.clientSatisfaction,
                          ),
                        },
                        {
                          label: "Pending summaries",
                          value: consultant.dashboard.pendingSummaries * 20,
                          valueLabel: String(consultant.dashboard.pendingSummaries),
                        },
                      ]}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="brand-item p-5">
          <p className="text-sm font-semibold text-foreground">
            Predlozi za prebacivanje klijenata
          </p>
          <div className="mt-4 grid gap-3">
            {data.transferSuggestions.map((transfer) => {
              const client = getClientById(data, transfer.clientId);
              const from = getConsultantById(data, transfer.fromConsultantId);
              const to = getConsultantById(data, transfer.toConsultantId);

              return (
                <div
                  key={transfer.id}
                  className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">
                        {client?.name}
                      </p>
                      <p className="text-sm text-muted">
                        {client?.company} / {client?.programModules.join(" / ")}
                      </p>
                    </div>
                    <StatusChip
                      label={transfer.status}
                      tone={
                        transfer.status === "Hitno"
                          ? "danger"
                          : transfer.status === "Spremno"
                            ? "success"
                            : "warning"
                      }
                    />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    {transfer.reason}
                  </p>
                  <p className="mt-3 text-sm text-foreground">
                    {from?.name} {"->"} {to?.name}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

function AdminSection({
  actor,
  data,
}: {
  actor: StaffUser;
  data: AppData;
}) {
  const integrations = integrationBlueprints.map((integration) => {
    const connectedKeys = integration.envKeys.filter((key) => Boolean(process.env[key]));

    return {
      ...integration,
      connectedKeys,
      status: connectedKeys.length === integration.envKeys.length
        ? "Connected"
        : connectedKeys.length
          ? "Planned"
          : "Needs setup",
    } as const;
  });

  return (
    <SectionCard
      eyebrow="Admin"
      title="Admin setup i operativni centar"
      description="Ovde su sada i integracije, onboarding novih ljudi i klijenata, BDP Excel import i biblioteka meeting template-ova."
    >
      <AdminSetupPanel
        actorName={actor.name}
        clients={data.clients}
        staffUsers={data.staffUsers}
        programs={data.programs}
        integrations={integrations}
        meetingTemplates={meetingTemplates}
        reminderRules={reminderRules}
        importBlueprints={importBlueprints}
      />
    </SectionCard>
  );
}

function ClientOverview({
  actor,
  data,
}: {
  actor: WorkspaceActor;
  data: AppData;
}) {
  if (actor.kind !== "client") {
    return null;
  }

  const client = getClientById(data, actor.clientId);
  if (!client) {
    return null;
  }

  const program = getProgramById(data, client.programId);
  const nextMeeting = getClientNextMeeting(client);
  const latestMeeting = getClientLatestMeeting(client);
  const openActions = getClientOpenActions(client);
  const meetingLoad = getClientMeetingLoad(client);
  const aiCoverage = getClientAiSummaryRate(client);
  const onTimeRate = getClientOnTimeRate(client);

  return (
    <>
      <SectionCard
        eyebrow="Client dashboard"
        title={`${client.name} portal`}
        description="Klijent sada vidi svoj program, dodeljene eksperte, shared/open akcije i pregled sastanaka po pravilima Master Mind ili BDP toka."
      >
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="brand-item p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap gap-2">
                  <StatusChip label={client.status} tone="accent" />
                  <StatusChip label={program?.name ?? "Program"} tone="neutral" />
                  <StatusChip
                    label={`Rizik ${client.riskLevel}`}
                    tone={getRiskTone(client.riskLevel)}
                  />
                </div>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                  {client.company}
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {getWorkflowLabel(client)}
                </p>
              </div>
              <div className="rounded-[20px] border border-white/10 bg-white/4 px-4 py-3">
                <p className="text-sm text-muted">Sledeci sastanak</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {nextMeeting
                    ? formatDateTime(nextMeeting.scheduledStartAt)
                    : "Nije zakazan"}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Health"
                value={formatPercent(client.analytics.healthScore)}
                hint="ukupni program signal"
              />
              <MetricCard
                label="Otvorene akcije"
                value={String(openActions.length)}
                hint={
                  client.sharedActionBoard.length
                    ? "shared action board"
                    : "meeting follow-up"
                }
              />
              <MetricCard
                label="AI coverage"
                value={formatPercent(aiCoverage)}
                hint="odrzani sastanci sa summary-jem"
              />
              <MetricCard
                label="Punctuality"
                value={formatPercent(onTimeRate)}
                hint="dolazak klijenta na vreme"
              />
            </div>
          </div>

          <div className="brand-item p-5">
            <p className="text-sm font-semibold text-foreground">
              Tim oko klijenta
            </p>
            <ExpertAssignments data={data} client={client} />
            <div className="mt-5 rounded-[18px] border border-white/8 bg-white/4 px-4 py-4">
              <p className="text-sm font-semibold text-foreground">
                Aktivni fokus
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                {client.monthlyGoal}
              </p>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <a href={client.driveRootUrl} className="brand-button-secondary">
                Drive hub
              </a>
              <Link href={`/clients/${client.id}`} className="brand-button-secondary">
                Detaljan profil
              </Link>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          eyebrow="Next"
          title="Naredni koraci"
          description="Otvorene akcije, naredni milestone i poslednji summary koji je poslat klijentu."
        >
          <div className="grid gap-3">
            <div className="brand-item p-4">
              <p className="text-sm font-semibold text-foreground">
                Naredni milestone
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                {client.nextMilestone}
              </p>
              <p className="mt-3 text-sm text-muted">
                Sastanci: {meetingLoad.total} / target {client.meetingAverageTarget}
              </p>
            </div>

            <div className="brand-item p-4">
              <p className="text-sm font-semibold text-foreground">
                Otvorene akcije
              </p>
              <div className="mt-3 space-y-3">
                {openActions.length ? (
                  openActions.map((action) => (
                    <OpenActionPreview key={action.id} action={action} />
                  ))
                ) : (
                  <p className="text-sm text-muted">
                    Nema otvorenih akcija trenutno.
                  </p>
                )}
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Program"
          title="Ritam i poslednji sastanak"
          description="Pregled programa, analytics signala i poslednjeg odrzanog summary-ja."
        >
          <div className="grid gap-4">
            <div className="brand-item p-4">
              <MiniBars
                items={[
                  {
                    label: "Action completion",
                    value: client.analytics.actionCompletion,
                    valueLabel: formatPercent(client.analytics.actionCompletion),
                  },
                  {
                    label: "Meeting consistency",
                    value: client.analytics.meetingConsistency,
                    valueLabel: formatPercent(client.analytics.meetingConsistency),
                  },
                  {
                    label: "Milestone progress",
                    value: client.analytics.milestoneProgress,
                    valueLabel: formatPercent(client.analytics.milestoneProgress),
                  },
                ]}
              />
            </div>

            {latestMeeting ? (
              <div className="brand-item p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">
                    Poslednji summary
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <StatusChip
                      label={latestMeeting.emailSentToClient ? "Email sent" : "Email pending"}
                      tone={latestMeeting.emailSentToClient ? "success" : "warning"}
                    />
                    <StatusChip
                      label={latestMeeting.aiSummaryReady ? "AI ready" : "AI pending"}
                      tone={latestMeeting.aiSummaryReady ? "info" : "neutral"}
                    />
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {latestMeeting.summary}
                </p>
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>
    </>
  );
}

function ClientMeetings({
  actor,
  data,
}: {
  actor: WorkspaceActor;
  data: AppData;
}) {
  if (actor.kind !== "client") {
    return null;
  }

  const client = getClientById(data, actor.clientId);
  if (!client) {
    return null;
  }

  const latestMeeting = getClientLatestMeeting(client);

  return (
    <>
      <SectionCard
        eyebrow="Meetings"
        title="Istorija sastanaka"
        description="Sada su prikazani i meeting compliance podaci: planirano vreme, stvarni start, trajanje, email i AI summary status."
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
                  <StatusChip label={meeting.status} tone={getMeetingTone(meeting.status)} />
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

              <p className="mt-4 text-sm leading-6 text-muted">{meeting.summary}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {meeting.participants.map((participant) => (
                  <StatusChip key={`${meeting.id}-${participant}`} label={participant} tone="neutral" />
                ))}
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-sm">
                <a href={meeting.recording.videoUrl} className="brand-button-secondary">
                  Video
                </a>
                <a href={meeting.recording.audioUrl} className="brand-button-secondary">
                  Audio
                </a>
                <a
                  href={meeting.recording.driveFolderUrl}
                  className="brand-button-secondary"
                >
                  Drive folder
                </a>
                <a href={meeting.recording.materialsUrl} className="brand-button-secondary">
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
                  label={meeting.emailSentToClient ? "Email sent" : "Email pending"}
                  tone={meeting.emailSentToClient ? "success" : "warning"}
                />
                <StatusChip
                  label={meeting.aiSummaryReady ? "AI summary ready" : "AI pending"}
                  tone={meeting.aiSummaryReady ? "info" : "neutral"}
                />
              </div>

              <div className="mt-5">
                <p className="text-sm font-semibold text-foreground">Action items</p>
                <div className="mt-3 grid gap-3">
                  {meeting.actions.length ? (
                    meeting.actions.map((action) => (
                      <OpenActionPreview key={action.id} action={action} />
                    ))
                  ) : (
                    <p className="text-sm text-muted">
                      Za ovaj sastanak nema dodatih akcija.
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {latestMeeting ? (
        <SectionCard
          eyebrow="AI"
          title="Demo AI summary"
          description="Ovaj mock flow pokazuje kako srpski audio sa sastanka ide ka strukturisanom summary-ju."
        >
          <MeetingSummaryGenerator
            clientName={client.name}
            meetingTitle={latestMeeting.title}
            defaultTranscript={
              latestMeeting.transcriptPreview ||
              "Klijent je podelio status zadataka i definisani su sledeci koraci."
            }
          />
        </SectionCard>
      ) : null}
    </>
  );
}

function ClientAnalytics({
  actor,
  data,
}: {
  actor: WorkspaceActor;
  data: AppData;
}) {
  if (actor.kind !== "client") {
    return null;
  }

  const client = getClientById(data, actor.clientId);
  if (!client) {
    return null;
  }

  const meetingLoad = getClientMeetingLoad(client);
  const onTimeRate = getClientOnTimeRate(client);
  const aiCoverage = getClientAiSummaryRate(client);
  const targetUsage = Math.min(
    100,
    Math.round((meetingLoad.total / client.meetingAverageTarget) * 100),
  );

  return (
    <SectionCard
      eyebrow="Analytics"
      title="Client dashboard analytics"
      description="Klijent analytics sada ukljucuje i meeting target, punctuality i AI summary coverage uz standardne health signale."
    >
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="grid gap-3 md:grid-cols-2">
          <MetricCard
            label="Health score"
            value={formatPercent(client.analytics.healthScore)}
            hint="ukupni status programa"
          />
          <MetricCard
            label="Action completion"
            value={formatPercent(client.analytics.actionCompletion)}
            hint="realizacija dogovorenog"
          />
          <MetricCard
            label="Punctuality"
            value={formatPercent(onTimeRate)}
            hint="dolazak na vreme"
          />
          <MetricCard
            label="AI coverage"
            value={formatPercent(aiCoverage)}
            hint="summary spreman posle sastanka"
          />
        </div>

        <div className="brand-item p-5">
          <MiniBars
            items={[
              {
                label: "Revenue delta",
                value: Math.max(8, Math.min(100, 50 + client.analytics.revenueDelta * 2)),
                valueLabel: formatSignedPercent(client.analytics.revenueDelta),
              },
              {
                label: "Milestone progress",
                value: client.analytics.milestoneProgress,
                valueLabel: formatPercent(client.analytics.milestoneProgress),
              },
              {
                label: "Meeting target usage",
                value: targetUsage,
                valueLabel: `${meetingLoad.total}/${client.meetingAverageTarget}`,
              },
              {
                label: "Meeting consistency",
                value: client.analytics.meetingConsistency,
                valueLabel: formatPercent(client.analytics.meetingConsistency),
              },
            ]}
          />
        </div>
      </div>
    </SectionCard>
  );
}

function ClientResources({
  actor,
  data,
}: {
  actor: WorkspaceActor;
  data: AppData;
}) {
  if (actor.kind !== "client") {
    return null;
  }

  const client = getClientById(data, actor.clientId);
  if (!client) {
    return null;
  }

  const actionBoard = getClientAllActions(client);

  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <SectionCard
        eyebrow="Drive"
        title="Drive i deljeni hub"
        description="Centralno mesto za materijale, zapisnike i sastanak snimke."
      >
        <div className="grid gap-3">
          <div className="brand-item p-4">
            <p className="font-semibold text-foreground">Glavni folder</p>
            <p className="mt-2 text-sm text-muted">{client.driveRootUrl}</p>
          </div>
          <div className="brand-item p-4">
            <p className="font-semibold text-foreground">Programski moduli</p>
            <p className="mt-2 text-sm text-muted">
              {client.programModules.join(" / ")}
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Documents"
        title="Dokumentacija"
        description="Fajlovi i dashboard-i koji su podeljeni sa klijentom."
      >
        <div className="grid gap-3">
          {client.documents.map((document) => (
            <div key={document.id} className="brand-item p-4">
              <p className="font-semibold text-foreground">{document.name}</p>
              <p className="mt-1 text-sm text-muted">
                {document.type} / {document.status}
              </p>
              <p className="mt-1 text-sm text-muted">
                Update {formatDateTime(document.lastUpdated)}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Actions"
        title={
          client.sharedActionBoard.length ? "Shared action board" : "Follow-up akcije"
        }
        description="Taskovi, reminder pravila i resursi koji ostaju vidljivi klijentu."
      >
        <div className="grid gap-3">
          {actionBoard.length ? (
            actionBoard.map((action) => (
              <OpenActionPreview key={action.id} action={action} />
            ))
          ) : (
            <p className="text-sm text-muted">
              Nema aktivnih akcija za prikaz.
            </p>
          )}

          {client.resources.map((resource) => (
            <div key={resource.id} className="brand-item p-4">
              <p className="font-semibold text-foreground">{resource.title}</p>
              <p className="mt-1 text-sm text-muted">
                {resource.category} / poslato {formatDate(resource.lastShared)}
              </p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function getProgramClientCount(data: AppData, programId: string) {
  return data.clients.filter((client) => client.programId === programId).length;
}

export function WorkspaceView({
  actor,
  section,
  data,
}: {
  actor: WorkspaceActor;
  section: WorkspaceSection;
  data: AppData;
}) {
  if (actor.kind === "client") {
    switch (section) {
      case "meetings":
        return <ClientMeetings actor={actor} data={data} />;
      case "analytics":
        return <ClientAnalytics actor={actor} data={data} />;
      case "resources":
        return <ClientResources actor={actor} data={data} />;
      default:
        return <ClientOverview actor={actor} data={data} />;
    }
  }

  switch (section) {
    case "clients":
      return <StaffClients actor={actor} data={data} />;
    case "analytics":
      return <StaffAnalytics actor={actor} data={data} />;
    case "programs":
      return <StaffPrograms data={data} />;
    case "team":
      return canTransferClients(actor) ? (
        <TeamSection actor={actor} data={data} />
      ) : (
        <StaffOverview actor={actor} data={data} />
      );
    case "admin":
      return canAccessAdmin(actor) ? (
        <AdminSection actor={actor} data={data} />
      ) : (
        <StaffOverview actor={actor} data={data} />
      );
    default:
      return <StaffOverview actor={actor} data={data} />;
  }
}
