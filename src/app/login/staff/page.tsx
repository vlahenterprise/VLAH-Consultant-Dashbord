import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatusChip } from "@/components/status-chip";
import { loadAppData } from "@/lib/app-data";

export const dynamic = "force-dynamic";

export default async function StaffLoginPage() {
  const data = await loadAppData();

  return (
    <AppShell>
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          eyebrow="Zaposleni"
          title="Ulaz za konsultante i menadzere"
          description="Izaberi interni profil za pregled rada po ulozi."
        >
          <div className="grid gap-4">
            <input className="brand-input" placeholder="Email adresa" />
            <input
              className="brand-input"
              placeholder="Lozinka"
              type="password"
            />
            <button type="button" className="brand-button">
              Nastavi
            </button>
            <p className="text-sm text-muted">
              Trenutno koristi kartice desno za ulaz. Pravi login dolazi u sledecem backend koraku.
            </p>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Profili"
          title="Izaberi ulogu"
          description="Konsultant, menadzer i admin pristup imaju odvojene prikaze i prava."
        >
          <div className="grid gap-3">
            {data.staffUsers.map((user) => (
              <Link
                key={user.id}
                href={`/workspace/${user.id}`}
                className="brand-item flex flex-wrap items-center justify-between gap-3 p-5 transition hover:-translate-y-0.5"
              >
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    {user.name}
                  </p>
                  <p className="text-sm text-muted">
                    {user.title} · {user.focus}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusChip
                    label={user.role === "manager" ? "Menadzer" : "Konsultant"}
                    tone="accent"
                  />
                  {user.adminAddon ? (
                    <StatusChip label="Admin pristup" tone="info" />
                  ) : null}
                </div>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
