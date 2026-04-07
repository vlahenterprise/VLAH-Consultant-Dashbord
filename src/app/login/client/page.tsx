import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatusChip } from "@/components/status-chip";
import { getClientById, getProgramById, loadAppData } from "@/lib/app-data";

export const dynamic = "force-dynamic";

export default async function ClientLoginPage() {
  const data = await loadAppData();

  return (
    <AppShell>
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          eyebrow="Klijenti"
          title="Poseban portal za klijente"
          description="Klijent vidi samo svoju karticu, sastanke, akcije i materijale."
        >
          <div className="grid gap-4">
            <input className="brand-input" placeholder="Email klijenta" />
            <input
              className="brand-input"
              placeholder="Lozinka"
              type="password"
            />
            <button type="button" className="brand-button">
              Nastavi
            </button>
            <p className="text-sm text-muted">
              Trenutno koristi kartice desno za ulaz. Svaki portal je odvojen po klijentu.
            </p>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Portali"
          title="Izaberi klijenta"
          description="Svaki klijent ulazi samo u svoj program i svoje zadatke."
        >
          <div className="grid gap-3">
            {data.clientPortalUsers.map((user) => {
              const client = getClientById(data, user.clientId);
              const program = client ? getProgramById(data, client.programId) : null;

              return (
                <Link
                  key={user.id}
                  href={`/workspace/${user.id}`}
                  className="brand-item flex flex-wrap items-center justify-between gap-3 p-5 transition hover:-translate-y-0.5"
                >
                  <div>
                    <p className="text-lg font-semibold text-foreground">
                      {user.name}
                    </p>
                    <p className="text-sm text-muted">{user.company}</p>
                    <p className="mt-1 text-sm text-muted">
                      Program: {program?.name ?? "nije povezano"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusChip label="Portal klijenta" tone="success" />
                    {client ? (
                      <StatusChip label={client.stage} tone="neutral" />
                    ) : null}
                  </div>
                </Link>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
