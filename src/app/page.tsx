import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";
import { StatusChip } from "@/components/status-chip";
import { loadAppData } from "@/lib/app-data";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await loadAppData();

  return (
    <AppShell>
      <SectionCard
        eyebrow="Ulaz u sistem"
        title="VLAH Consultant Hub"
        description="Jedan tok za interne konsultante i menadzere, drugi za klijente. Sve je organizovano oko Master Mind i BDP rada."
      >
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="brand-item p-5">
            <div className="flex flex-wrap gap-2">
              <StatusChip label="Konsultant" tone="accent" />
              <StatusChip label="Menadzer" tone="warning" />
              <StatusChip label="Admin pristup" tone="info" />
              <StatusChip label="Portal klijenta" tone="success" />
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
              Izaberi ulogu, udji u svoj prostor i radi kroz jasan program, sastanke i akcije.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
              Konsultant vidi svoje klijente. Menadzer vidi tim i raspodelu.
              Admin pristup otvara setup, import i integracije. Klijent vidi samo
              svoju karticu, sastanke, materijale i akcije.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-[22px] border border-white/8 bg-white/4 p-4">
                <p className="text-sm font-semibold text-foreground">
                  Master Mind
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Profitabilnost i Organizacija. Zajednicki kickoff 60 min sa oba
                  eksperta, pa odvojeni 1:1 tokovi do zatvaranja rada i finalnog review-a.
                </p>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/4 p-4">
                <p className="text-sm font-semibold text-foreground">BDP</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Operations, Finance i HR & Leadership. U prvom delu meseca je
                  3:1, u drugom delu tri 1:1 sastanka i jedna jedinstvena akciona lista.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/login/staff" className="brand-button">
                Ulaz za zaposlene
              </Link>
              <Link href="/login/client" className="brand-button-secondary">
                Ulaz za klijente
              </Link>
              <Link href="/clients" className="brand-button-secondary">
                Baza klijenata
              </Link>
            </div>
          </div>

          <div className="brand-item p-5">
            <p className="text-sm font-semibold text-foreground">
              Kako se krecemo kroz aplikaciju
            </p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-muted">
              <p>1. Zaposleni ulazi u svoj workspace.</p>
              <p>2. Menadzer prati tim, raspodelu i klijente pod rizikom.</p>
              <p>3. Admin uredjuje setup: programi, ljudi, import i integracije.</p>
              <p>4. Klijent vidi samo svoju karticu, sastanke, materijale i akcije.</p>
              <p>5. Sastanci cuvaju vreme, prisustvo, snimke, izvestaj i dogovorene taskove.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          eyebrow="Zaposleni"
          title="Izaberi interni profil"
          description="Privremeni ulaz dok ne ukljucimo pravu autentikaciju."
        >
          <div className="grid gap-3">
            {data.staffUsers.map((user) => (
              <Link
                key={user.id}
                href={`/workspace/${user.id}`}
                className="brand-item flex flex-wrap items-center justify-between gap-3 p-4 transition hover:-translate-y-0.5"
              >
                <div>
                  <p className="font-semibold text-foreground">{user.name}</p>
                  <p className="text-sm text-muted">
                    {user.title} / {user.team}
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

        <SectionCard
          eyebrow="Klijenti"
          title="Izaberi portal klijenta"
          description="Klijent vidi samo svoj program, sastanke, materijale i akcije."
        >
          <div className="grid gap-3">
            {data.clientPortalUsers.map((user) => (
              <Link
                key={user.id}
                href={`/workspace/${user.id}`}
                className="brand-item flex flex-wrap items-center justify-between gap-3 p-4 transition hover:-translate-y-0.5"
              >
                <div>
                  <p className="font-semibold text-foreground">{user.name}</p>
                  <p className="text-sm text-muted">{user.company}</p>
                </div>
                <StatusChip label="Portal klijenta" tone="success" />
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
