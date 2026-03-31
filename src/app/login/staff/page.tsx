import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatusChip } from "@/components/status-chip";
import { loadAppData } from "@/lib/app-data";

export default async function StaffLoginPage() {
  const data = await loadAppData();

  return (
    <AppShell>
      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard
          eyebrow="Staff login"
          title="Ulaz za konsultante i menadzere"
          description="Za sada je login mock, ali flow i permissions su vec odvojeni od client porta."
        >
          <div className="grid gap-4">
            <input className="brand-input" placeholder="Email adresa" />
            <input
              className="brand-input"
              placeholder="Lozinka"
              type="password"
            />
            <button type="button" className="brand-button">
              Demo login
            </button>
            <p className="text-sm text-muted">
              Sledeci backend korak: pravi auth, session i role mapping u bazi.
            </p>
          </div>
        </SectionCard>

        <SectionCard
          eyebrow="Quick access"
          title="Izaberi demo profil"
          description="Ovo simulira login zaposlenih sa consultant, manager i admin add-on permission kombinacijama."
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
                    label={user.role === "manager" ? "Manager" : "Consultant"}
                    tone="accent"
                  />
                  {user.adminAddon ? (
                    <StatusChip label="Admin add-on" tone="info" />
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
