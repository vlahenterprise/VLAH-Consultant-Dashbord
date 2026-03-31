import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatusChip } from "@/components/status-chip";
import { clientPortalUsers, getClientById } from "@/lib/mock-data";

export default function ClientLoginPage() {
  return (
    <AppShell>
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          eyebrow="Client login"
          title="Poseban portal za klijente"
          description="Klijent dobija sopstveni dashboard sa analytics, dokumentacijom i sastancima."
        >
          <div className="grid gap-4">
            <input className="brand-input" placeholder="Client email" />
            <input
              className="brand-input"
              placeholder="Lozinka"
              type="password"
            />
            <button type="button" className="brand-button">
              Demo login
            </button>
            <p className="text-sm text-muted">
              Kasnije ide poseban auth flow i ogranicen pristup samo njihovim
              podacima i materijalima.
            </p>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Quick access"
          title="Izaberi demo klijenta"
          description="Svaki klijent ima svoj dashboard, naredne sastanke, action items i deljene resurse."
        >
          <div className="grid gap-3">
            {clientPortalUsers.map((user) => {
              const client = getClientById(user.clientId);

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
                      Program: {client ? client.programId : "n/a"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusChip label="Client portal" tone="success" />
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
