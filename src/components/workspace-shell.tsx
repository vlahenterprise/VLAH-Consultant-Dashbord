"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { canAccessAdmin, canTransferClients } from "@/lib/permissions";
import {
  NavigationItem,
  WorkspaceActor,
} from "@/lib/types";
import { StatusChip } from "@/components/status-chip";
import {
  IconCalendar,
  IconChart,
  IconFolder,
  IconHome,
  IconSettings,
  IconSparkles,
  IconSwap,
  IconUsers,
} from "@/components/icons";

const iconByLabel = {
  Dashboard: IconHome,
  Clients: IconUsers,
  Analytics: IconChart,
  Programs: IconSparkles,
  Team: IconSwap,
  Admin: IconSettings,
  Meetings: IconCalendar,
  Resources: IconFolder,
} as const;

const groupTitles = {
  work: "Rad",
  personal: "Licno",
  admin: "Admin",
} as const;

export function WorkspaceShell({
  actor,
  navigation,
  children,
}: {
  actor: WorkspaceActor;
  navigation: NavigationItem[];
  children: ReactNode;
}) {
  const pathname = usePathname();

  const sections = (["work", "personal", "admin"] as const)
    .map((group) => ({
      group,
      title: groupTitles[group],
      items: navigation.filter((item) => item.group === group),
    }))
    .filter((entry) => entry.items.length > 0);

  return (
    <div className="workspace-shell">
      <aside className="brand-panel sidebar-panel">
        <div className="flex flex-col gap-6">
          <div className="sidebar-brand">
            <div className="sidebar-logo">
              <Image
                src="/branding/vlah-enterprise-dark.svg"
                alt="VLAH Enterprise"
                width={46}
                height={46}
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {actor.kind === "client" ? actor.company : actor.name}
              </p>
              <p className="text-xs uppercase tracking-[0.16em] text-muted">
                {actor.kind === "client" ? actor.portalLabel : actor.team}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="brand-item px-4 py-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted">
                Aktivna sesija
              </p>
              <p className="mt-2 text-lg font-semibold text-foreground">
                {actor.name}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {actor.kind === "staff" ? (
                  <>
                    <StatusChip
                      label={
                        actor.role === "manager" ? "Manager" : "Consultant"
                      }
                      tone="accent"
                    />
                    {actor.adminAddon ? (
                      <StatusChip label="Admin add-on" tone="info" />
                    ) : null}
                  </>
                ) : (
                  <StatusChip label="Client portal" tone="info" />
                )}
              </div>
            </div>

            {actor.kind === "staff" ? (
              <div className="brand-item px-4 py-4 text-sm text-muted">
                <p>{canTransferClients(actor) ? "Manager moze da prebacuje klijente izmedju konsultanata." : "Ovaj korisnik nema transfer prava."}</p>
                <p className="mt-2">
                  {canAccessAdmin(actor)
                    ? "Admin add-on otvara settings, programe i integracije."
                    : "Admin deo je zatvoren dok se add-on ne dodeli."}
                </p>
              </div>
            ) : null}
          </div>

          <nav className="grid gap-5" aria-label="Workspace navigation">
            {sections.map((section) => (
              <div key={section.group} className="sidebar-group">
                <div className="sidebar-group-title">
                  <span>{section.title}</span>
                  <span>{section.items.length}</span>
                </div>
                <div className="grid gap-1">
                  {section.items.map((item) => {
                    const Icon =
                      iconByLabel[item.label as keyof typeof iconByLabel] ??
                      IconHome;
                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(`${item.href}/`);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`sidebar-link ${
                          isActive ? "sidebar-link-active" : ""
                        }`}
                      >
                        <Icon size={16} />
                        <span>{item.label}</span>
                        {item.badge ? (
                          <span className="sidebar-badge">{item.badge}</span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="mt-auto grid gap-2">
            <Link href="/login/staff" className="brand-button-secondary">
              Staff login
            </Link>
            <Link href="/login/client" className="brand-button-secondary">
              Client login
            </Link>
          </div>
        </div>
      </aside>

      <main className="workspace-main">{children}</main>
    </div>
  );
}
