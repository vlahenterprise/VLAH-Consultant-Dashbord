import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatusChip } from "@/components/status-chip";
import {
  getClientAssignedExperts,
  getClientMeetingLoad,
  getClientNextMeeting,
  getClientOpenActions,
} from "@/lib/client-utils";
import { formatDate, formatDateTime } from "@/lib/formatting";
import { clients, getProgramById } from "@/lib/mock-data";

export default function ClientsPage() {
  return (
    <AppShell>
      <SectionCard
        eyebrow="Client base"
        title="Svi klijenti"
        description="Pregled baze klijenata sa programom, modulima, dodeljenim ekspertima, meeting target-om i direktnim ulazom u detaljan profil."
      >
        <div className="grid gap-4">
          {clients.map((client) => {
            const program = getProgramById(client.programId);
            const nextMeeting = getClientNextMeeting(client);
            const meetingLoad = getClientMeetingLoad(client);
            const openActions = getClientOpenActions(client);
            const experts = getClientAssignedExperts(client);

            return (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="brand-item block px-5 py-5 transition hover:-translate-y-1"
              >
                <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr_0.7fr] lg:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-foreground">
                        {client.name}
                      </p>
                      <StatusChip
                        label={client.status}
                        tone={client.status === "Aktivan" ? "success" : "neutral"}
                      />
                    </div>
                    <p className="mt-1 text-sm text-muted">{client.company}</p>
                    <p className="mt-3 text-sm leading-6 text-muted">
                      {client.monthlyGoal}
                    </p>
                  </div>

                  <div className="grid gap-2 text-sm text-muted">
                    <p>
                      <span className="font-semibold text-foreground">Program:</span>{" "}
                      {program?.name}
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">Moduli:</span>{" "}
                      {client.programModules.join(" / ")}
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">Start:</span>{" "}
                      {formatDate(client.startDate)}
                    </p>
                    <p>
                      <span className="font-semibold text-foreground">Sastanci:</span>{" "}
                      {meetingLoad.total} / target {client.meetingAverageTarget}
                    </p>
                  </div>

                  <div className="flex flex-col items-start gap-2 lg:items-end">
                    <StatusChip
                      label={`Rizik: ${client.riskLevel}`}
                      tone={
                        client.riskLevel === "Visok"
                          ? "danger"
                          : client.riskLevel === "Srednji"
                            ? "warning"
                            : "success"
                      }
                    />
                    <p className="text-sm text-muted">
                      Sledeci sastanak:{" "}
                      {nextMeeting
                        ? formatDateTime(nextMeeting.scheduledStartAt)
                        : "nema zakazanog"}
                    </p>
                    <p className="text-sm text-muted">
                      Otvorene akcije: {openActions.length}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {experts.map(({ assignment, consultant }) => (
                    <StatusChip
                      key={`${client.id}-${assignment.module}`}
                      label={`${assignment.module}: ${consultant.name}`}
                      tone="neutral"
                    />
                  ))}
                </div>
              </Link>
            );
          })}
        </div>
      </SectionCard>
    </AppShell>
  );
}
