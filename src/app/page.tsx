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
        eyebrow="Brand-aligned MVP"
        title="Consultant CRM po istom VLAH dark premium sistemu"
        description="Prvi lokalni MVP sada prati isti vizuelni sistem kao Employer Management System, ali i konkretan operativni model za Master Mind i BDP."
      >
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="brand-item p-5">
            <div className="flex flex-wrap gap-2">
              <StatusChip label="Consultant" tone="accent" />
              <StatusChip label="Manager" tone="warning" />
              <StatusChip label="Admin add-on" tone="info" />
              <StatusChip label="Client portal" tone="success" />
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
              Imamo role model, login tokove i dashboard-e za zaposlene i klijente.
            </p>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
              Manager moze da prebacuje klijente sa konsultanta na konsultanta.
              Admin je add-on permission koji se daje consultant-u ili
              manager-u i otvara settings/program/admin zonu, ali sam po sebi ne
              daje transfer pravo.
            </p>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-[22px] border border-white/8 bg-white/4 p-4">
                <p className="text-sm font-semibold text-foreground">
                  Master Mind
                </p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Profitabilnost i Organizacija. Prvi sastanak je zajednicki 60
                  min sa oba eksperta, pa se rad razdvaja u odvojene 1:1 tokove.
                </p>
              </div>
              <div className="rounded-[22px] border border-white/8 bg-white/4 p-4">
                <p className="text-sm font-semibold text-foreground">BDP</p>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Operations, Finance i HR & Leadership. Na pocetku meseca ide
                  3:1 kickoff, zatim individualni end-of-month review-i i shared
                  action board za klijenta.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/login/staff" className="brand-button">
                Login za zaposlene
              </Link>
              <Link href="/login/client" className="brand-button-secondary">
                Login za klijente
              </Link>
            </div>
          </div>

          <div className="brand-item p-5">
            <p className="text-sm font-semibold text-foreground">
              Sta je sada ukljuceno
            </p>
            <div className="mt-4 space-y-3 text-sm leading-6 text-muted">
              <p>- Public landing, staff login i client login.</p>
              <p>- Role-based workspace za consultant, manager i client portal.</p>
              <p>- Master Mind i BDP program setup sa modulima i meeting pravilima.</p>
              <p>- Admin add-on sekcija za integracije, onboarding i Excel import.</p>
              <p>- User dashboard analytics i client dashboard analytics.</p>
              <p>- Meeting compliance: start/end, punctuality, overrun i drive lokacije.</p>
              <p>- Pripremljen setup za Zoom, Thinkific, email, Drive i OpenAI povezivanje.</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          eyebrow="Demo access"
          title="Brzi ulaz za zaposlene"
          description="Mock login dok ne uvedemo pravi auth."
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

        <SectionCard
          eyebrow="Client access"
          title="Brzi ulaz za klijente"
          description="Poseban dashboard sa analytics, dokumentacijom i istorijom sastanaka."
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
                <StatusChip label="Client portal" tone="success" />
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>
    </AppShell>
  );
}
