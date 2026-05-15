import {
  Client,
  ClientDataSource,
  CustomerServiceNote,
} from "@/lib/types";

type ClientCore = Pick<
  Client,
  "programId" | "programModules" | "nextMilestone" | "stage" | "monthlyGoal"
>;

export function buildDefaultClientDataSources(
  client: ClientCore,
): ClientDataSource[] {
  const thinkificMetric =
    client.programId === "bdp"
      ? "Napredak kursa i materijala po mesecnom ciklusu"
      : "Napredak kroz Master Mind materijale i sesije";

  return [
    {
      id: "thinkific",
      label: "Thinkific",
      status: client.programId === "bdp" ? "Povezano" : "Rucno",
      externalId: client.programId === "bdp" ? "thinkific-bdp-active" : "",
      owner: "Customer Service",
      summary:
        client.programId === "bdp"
          ? "Thinkific progres je povezan i moze da puni client portal sa statusom edukativnog dela programa."
          : "Thinkific profil moze da se poveze kada klijent koristi edukativni deo Master Mind rada.",
      metrics: [thinkificMetric, `Moduli: ${client.programModules.join(" / ")}`],
      lastSyncedAt:
        client.programId === "bdp" ? new Date("2026-05-10T09:30:00+02:00").toISOString() : undefined,
    },
    {
      id: "ops-system",
      label: "Optiverse / operativni sistem",
      status: "Rucno",
      externalId: "",
      owner: "Konsultant",
      summary:
        "Spoljni operativni izvor jos nije povezan. Kada se poveze Optiverse, profil klijenta moze da vuce operativne signale, a do tada ekspert unosi izvestaj rucno ili kroz audio transkript.",
      metrics: [client.stage, client.nextMilestone],
    },
    {
      id: "customer-service",
      label: "Customer Service",
      status: "Povezano",
      externalId: "cs-handoff-active",
      owner: "Customer Service",
      summary:
        "Customer Service moze da dopuni onboarding, logistiku i operativne napomene za klijenta.",
      metrics: [client.monthlyGoal],
      lastSyncedAt: new Date("2026-05-12T14:00:00+02:00").toISOString(),
    },
  ];
}

export function buildDefaultCustomerServiceNotes(): CustomerServiceNote[] {
  return [];
}
