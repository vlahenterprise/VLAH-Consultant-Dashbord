import Link from "next/link";
import { AdminSetupPanel } from "@/components/admin-setup-panel";
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
            {consultant.name} / {assignment.specialty} / {assignment.responsibility ?? "Lead"}
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
        eyebrow="Pregled"
        title={actor.name}
        description="Portfolio, sastanci i akcije koje ova uloga treba da prati."
      >
        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="brand-item p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap gap-2">
                  <StatusChip
                    label={actor.role === "manager" ? "Menadzer" : "Konsultant"}
                    tone="accent"
                  />
                  {actor.adminAddon ? (
                    <StatusChip label="Admin pristup" tone="info" />
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
                <p>Sledeci slobodan termin</p>
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
                label="Izvestaji"
                value={String(pendingAiSummaries)}
                hint="cekaju obradu"
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
              Sta ova uloga moze
            </p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-muted">
              <p>
                {actor.role === "manager"
                  ? "Vidi timski portfolio i moze da prebacuje klijente."
                  : "Vidi dodeljene klijente i unosi sastanke, izvestaje i linkove."}
              </p>
              <p>
                Master Mind: zajednicki kickoff, zatim Profitabilnost i Organizacija odvojeno.
              </p>
              <p>
                BDP: mesecni 3:1, tri 1:1 sastanka i jedna zajednicka action lista.
              </p>
              <p>
                {actor.adminAddon
                  ? "Setup je otkljucan za programe, integracije i import."
                  : "Setup nije dostupan bez admin add-on-a."}
              </p>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
        eyebrow="Klijenti"
          title="Vidljivi klijenti"
          description="Klijenti, program, moduli, eksperti i sledeci sastanak."
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
                      Sastanci: {meetingLoad.total} / norma {client.meetingAverageTarget}
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
          eyebrow="Fokus"
          title="Fokus ove nedelje"
          description="Rizik, naredni sastanci i otvorene akcije."
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
      eyebrow="Klijenti"
      title="Baza vidljiva ovoj ulozi"
      description="Klik na klijenta otvara detaljan operativni profil."
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
                <p>Tok rada: {getWorkflowLabel(client)}</p>
                <p>
                  Sastanci: {meetingLoad.total} / norma {client.meetingAverageTarget}
                </p>
                <p>Otvorene akcije: {openActions.length}</p>
                <p>
                  Sledeci sastanak:{" "}
                  {nextMeeting
                    ? formatDateTime(nextMeeting.scheduledStartAt)
                    : "nema"}
                </p>
                <p>Drive: {client.driveRootUrl.replace("https://", "")}</p>
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
        eyebrow="Analitika"
        title="Portfolio signal"
        description="Stanje, akcije, ritam sastanaka i obrada izvestaja."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard
            label="Stanje"
            value={formatPercent(avgHealth)}
            hint="preko vidljivih klijenata"
          />
          <MetricCard
            label="Zavrsene akcije"
            value={formatPercent(avgActionCompletion)}
            hint="realizacija taskova"
          />
          <MetricCard
            label="Ritam sastanaka"
            value={formatPercent(avgMeetingConsistency)}
            hint="disciplina cadence-a"
          />
          <MetricCard
            label="Izvestaji"
            value={formatPercent(avgAiCoverage)}
            hint="sastanci sa izvestajem"
          />
          <MetricCard
            label="U okviru norme"
            value={`${clientsWithinTarget}/${visibleClients.length}`}
            hint={`prosecno ${avgMeetingLoad.toFixed(1)} sastanka`}
          />
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard
          eyebrow="Klijenti"
          title="Stanje po klijentima"
          description="Brz pregled stanja po svakom klijentu."
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
          eyebrow="Izvrsenje"
          title="Sastanci i izvestaji"
          description="Norma sastanaka, obrada izvestaja i dolazak na vreme."
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
                          label: "Koriscenje norme",
                          value: targetRatio,
                          valueLabel: `${meetingLoad.total}/${client.meetingAverageTarget}`,
                        },
                        {
                          label: "Pokrivenost izvestajima",
                          value: getClientAiSummaryRate(client),
                          valueLabel: formatPercent(getClientAiSummaryRate(client)),
                        },
                        {
                          label: "Dolazak na vreme",
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
      eyebrow="Programi"
      title="Programi"
      description="Master Mind i BDP pravila rada."
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
      eyebrow="Menadzer"
      title="Raspodela klijenata"
      description="Menadzer prati opterecenje tima i transfer klijenata."
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
                        <StatusChip label="Admin pristup" tone="info" />
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
                Predlozi za transfer
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
      eyebrow="Setup"
      title="Setup"
      description="Programi, ljudi, klijenti, import i integracije na jednom mestu."
    >
      <AdminSetupPanel
        actorName={actor.name}
        clients={data.clients}
        staffUsers={data.staffUsers}
        programs={data.programs}
        integrations={integrations}
        reportTemplates={data.reportTemplates}
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
        eyebrow="Portal klijenta"
        title={`Portal: ${client.name}`}
        description="Program, eksperti, naredni sastanak i otvorene akcije."
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
                label="Stanje"
                value={formatPercent(client.analytics.healthScore)}
                hint="ukupni program signal"
              />
              <MetricCard
                label="Otvorene akcije"
                value={String(openActions.length)}
                hint={
                  client.sharedActionBoard.length
                    ? "zajednicka action lista"
                    : "follow-up sastanka"
                }
              />
              <MetricCard
                label="Izvestaji"
                value={formatPercent(aiCoverage)}
                hint="sastanci sa izvestajem"
              />
              <MetricCard
                label="Dolazak na vreme"
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
          eyebrow="Dalje"
          title="Naredni koraci"
          description="Milestone, otvorene akcije i poslednji izvestaj."
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
                Sastanci: {meetingLoad.total} / norma {client.meetingAverageTarget}
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
          description="Programski ritam i poslednji odrzani sastanak."
        >
          <div className="grid gap-4">
            <div className="brand-item p-4">
              <MiniBars
                items={[
                  {
                    label: "Zavrsene akcije",
                    value: client.analytics.actionCompletion,
                    valueLabel: formatPercent(client.analytics.actionCompletion),
                  },
                  {
                    label: "Ritam sastanaka",
                    value: client.analytics.meetingConsistency,
                    valueLabel: formatPercent(client.analytics.meetingConsistency),
                  },
                  {
                    label: "Napredak faza",
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
                    Poslednji izvestaj
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <StatusChip
                      label={latestMeeting.emailSentToClient ? "Email poslat" : "Email ceka"}
                      tone={latestMeeting.emailSentToClient ? "success" : "warning"}
                    />
                    <StatusChip
                      label={latestMeeting.aiSummaryReady ? "Izvestaj spreman" : "Izvestaj ceka"}
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

  return (
    <SectionCard
      eyebrow="Sastanci"
      title="Istorija sastanaka"
      description="Planirano vreme, stvarni start, trajanje, prisutni, materijali i izvestaj."
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
                label={meeting.emailSentToClient ? "Email poslat" : "Email ceka"}
                tone={meeting.emailSentToClient ? "success" : "warning"}
              />
              <StatusChip
                label={meeting.aiSummaryReady ? "Izvestaj spreman" : "Izvestaj ceka"}
                tone={meeting.aiSummaryReady ? "info" : "neutral"}
              />
            </div>

            <div className="mt-5">
              <p className="text-sm font-semibold text-foreground">Akcije</p>
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
      eyebrow="Analitika"
      title="Analitika klijenta"
      description="Stanje, akcije, dolazak na vreme i obrada izvestaja."
    >
      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="grid gap-3 md:grid-cols-2">
          <MetricCard
            label="Stanje"
            value={formatPercent(client.analytics.healthScore)}
            hint="ukupni status programa"
          />
          <MetricCard
            label="Zavrsene akcije"
            value={formatPercent(client.analytics.actionCompletion)}
            hint="realizacija dogovorenog"
          />
          <MetricCard
            label="Dolazak na vreme"
            value={formatPercent(onTimeRate)}
            hint="dolazak na vreme"
          />
          <MetricCard
            label="Izvestaji"
            value={formatPercent(aiCoverage)}
            hint="izvestaj spreman"
          />
        </div>

        <div className="brand-item p-5">
          <MiniBars
            items={[
              {
                label: "Promena prihoda",
                value: Math.max(8, Math.min(100, 50 + client.analytics.revenueDelta * 2)),
                valueLabel: formatSignedPercent(client.analytics.revenueDelta),
              },
              {
                label: "Napredak faza",
                value: client.analytics.milestoneProgress,
                valueLabel: formatPercent(client.analytics.milestoneProgress),
              },
              {
                label: "Koriscenje norme",
                value: targetUsage,
                valueLabel: `${meetingLoad.total}/${client.meetingAverageTarget}`,
              },
              {
                label: "Ritam sastanaka",
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
        eyebrow="Dokumenti"
        title="Dokumentacija"
        description="Fajlovi i materijali podeljeni sa klijentom."
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
        eyebrow="Akcije"
        title={
          client.sharedActionBoard.length ? "Zajednicka action lista" : "Follow-up akcije"
        }
        description="Taskovi, reminder pravila i resursi koji ostaju vidljivi klijentu."
      >
        <div className="grid gap-3">
          <div className="brand-item p-4">
            <p className="font-semibold text-foreground">Povezani izvori</p>
            <div className="mt-3 grid gap-3">
              {client.dataSources.map((source) => (
                <div
                  key={source.id}
                  className="rounded-[18px] border border-white/8 bg-white/4 px-4 py-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="font-semibold text-foreground">{source.label}</p>
                    <StatusChip label={source.status} tone="neutral" />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted">{source.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {source.metrics.map((metric) => (
                      <span key={metric} className="brand-pill">
                        {metric}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

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
