import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";
import { StatusChip } from "@/components/status-chip";

const navigation = [
  { href: "/", label: "Pocetna" },
  { href: "/login/staff", label: "Staff login" },
  { href: "/login/client", label: "Client login" },
  { href: "/clients", label: "CRM база" },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-page">
      <div className="public-stack">
        <header className="brand-panel px-5 py-5 md:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="rounded-[20px] border border-white/10 bg-white/4 p-3 shadow-[var(--shadow-inset)]">
                <Image
                  src="/branding/vlah-enterprise-dark.svg"
                  alt="VLAH Enterprise"
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain"
                />
              </div>
              <div className="space-y-2">
                <StatusChip label="VLAH Consultant Hub" tone="accent" />
                <div>
                  <p className="text-2xl font-semibold tracking-tight text-foreground">
                    Consultant operations workspace
                  </p>
                  <p className="max-w-3xl text-sm leading-6 text-muted">
                    Lokalni MVP sa istim dark premium vizuelnim sistemom kao
                    vasa Employer aplikacija, sada prilagodjen radu sa
                    klijentima, konsultantima, menadzerima i admin addon-om.
                  </p>
                </div>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-2">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="brand-button-secondary"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
