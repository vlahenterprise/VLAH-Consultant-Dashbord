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
import { getProgramById, loadAppData } from "@/lib/app-data";

type ClientsPageProps = {
  searchParams?: Promise<{
    q?: string;
    program?: string;
    risk?: string;
    status?: string;
  }>;
};

function normalizeFilter(value?: string) {
  return value?.trim().toLowerCase() ?? "";
}

export default async function ClientsPage({ searchParams }: ClientsPageProps) {
  const data = await loadAppData();
  const filters = (await searchParams) ?? {};
  const searchValue = normalizeFilter(filters.q);
  const selectedProgram = filters.program ?? "all";
  const selectedRisk = filters.risk ?? "all";
  const selectedStatus = filters.status ?? "all";

  const filteredClients = data.clients.filter((client) => {
    const matchesSearch =
      !searchValue ||
      [
        client.name,
        client.company,
        client.email,
        client.city,
        ...client.tags,
        ...client.programModules,
      ].some((value) => value.toLowerCase().includes(searchValue));

    const matchesProgram =
      selectedProgram === "all" || client.programId === selectedProgram;
    const matchesRisk =
      selectedRisk === "all" || client.riskLevel === selectedRisk;
    const matchesStatus =
      selectedStatus === "all" || client.status === selectedStatus;

    return matchesSearch && matchesProgram && matchesRisk && matchesStatus;
  });

  const totalOpenActions = filteredClients.reduce(
    (sum, client) => sum + getClientOpenActions(client).length,
    0,
  );
  const atRiskCount = filteredClients.filter(
    (client) => client.riskLevel !== "Nizak",
  ).length;

  return (
    <AppShell>
      <div className="grid gap-4">
        <SectionCard
          eyebrow="Client base"
          title="CRM baza klijenata"
          description="Pretrazi i filtriraj portfolio po programu, riziku i statusu, pa udji direktno u detaljan profil klijenta."
        >
          <div className="grid gap-4">
            <form className="grid gap-3 xl:grid-cols-[1.3fr_0.7fr_0.7fr_0.7fr]">
              <input
                name="q"
                defaultValue={filters.q ?? ""}
                className="brand-input"
                placeholder="Pretraga po imenu, firmi, email-u, tagu ili modulu"
              />
              <select
                name="program"
                defaultValue={selectedProgram}
                className="brand-input"
              >
                <option value="all">Svi programi</option>
                {data.programs.map((program) => (
                  <option key={program.id} value={program.id}>
                    {program.name}
                  </option>
                ))}
              </select>
              <select
                name="risk"
                defaultValue={selectedRisk}
                className="brand-input"
              >
                <option value="all">Sav rizik</option>
                <option value="Nizak">Nizak</option>
                <option value="Srednji">Srednji</option>
                <option value="Visok">Visok</option>
              </select>
              <select
                name="status"
                defaultValue={selectedStatus}
                className="brand-input"
              >
                <option value="all">Svi statusi</option>
                <option value="Aktivan">Aktivan</option>
                <option value="Onboarding">Onboarding</option>
                <option value="Na cekanju">Na cekanju</option>
              </select>
            </form>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="brand-kpi">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">
                  Rezultati
                </p>
                <p className="mt-3 text-3xl font-semibold text-foreground">
                  {filteredClients.length}
                </p>
                <p className="mt-2 text-sm text-muted">
                  od ukupno {data.clients.length} klijenata
                </p>
              </div>
              <div className="brand-kpi">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">
                  Open actions
                </p>
                <p className="mt-3 text-3xl font-semibold text-foreground">
                  {totalOpenActions}
                </p>
                <p className="mt-2 text-sm text-muted">
                  kroz trenutno filtriran portfolio
                </p>
              </div>
              <div className="brand-kpi">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">
                  Povisen rizik
                </p>
                <p className="mt-3 text-3xl font-semibold text-foreground">
                  {atRiskCount}
                </p>
                <p className="mt-2 text-sm text-muted">
                  klijenata trazi vise paznje
                </p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Client list"
          title="Svi klijenti"
          description="Pregled baze klijenata sa programom, modulima, dodeljenim ekspertima, meeting target-om i direktnim ulazom u detaljan profil."
        >
          <div className="grid gap-4">
            {filteredClients.length ? (
              filteredClients.map((client) => {
                const program = getProgramById(data, client.programId);
                const nextMeeting = getClientNextMeeting(client);
                const meetingLoad = getClientMeetingLoad(client);
                const openActions = getClientOpenActions(client);
                const experts = getClientAssignedExperts(data, client);

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
                            tone={
                              client.status === "Aktivan" ? "success" : "neutral"
                            }
                          />
                        </div>
                        <p className="mt-1 text-sm text-muted">{client.company}</p>
                        <p className="mt-3 text-sm leading-6 text-muted">
                          {client.monthlyGoal}
                        </p>
                      </div>

                      <div className="grid gap-2 text-sm text-muted">
                        <p>
                          <span className="font-semibold text-foreground">
                            Program:
                          </span>{" "}
                          {program?.name}
                        </p>
                        <p>
                          <span className="font-semibold text-foreground">
                            Moduli:
                          </span>{" "}
                          {client.programModules.join(" / ")}
                        </p>
                        <p>
                          <span className="font-semibold text-foreground">
                            Start:
                          </span>{" "}
                          {formatDate(client.startDate)}
                        </p>
                        <p>
                          <span className="font-semibold text-foreground">
                            Sastanci:
                          </span>{" "}
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
              })
            ) : (
              <div className="brand-item px-5 py-8">
                <p className="text-lg font-semibold text-foreground">
                  Nema rezultata za zadate filtere.
                </p>
                <p className="mt-2 text-sm text-muted">
                  Probaj siri upit ili vrati filtere na &quot;all&quot;.
                </p>
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
