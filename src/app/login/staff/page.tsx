import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LoginPanel } from "@/components/login-panel";
import { loadAppData } from "@/lib/app-data";
import { getActorHomeHref, getAuthenticatedActor, getDemoPasswordForMode } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function StaffLoginPage() {
  const data = await loadAppData();
  const actor = await getAuthenticatedActor(data);

  if (actor) {
    redirect(getActorHomeHref(actor));
  }

  return (
    <AppShell>
      <LoginPanel
        mode="staff"
        introEyebrow="Zaposleni"
        introTitle="Ulaz za konsultante i menadzere"
        introDescription="Svaki zaposleni ulazi u svoj workspace i vidi samo ono sto mu pripada po ulozi."
        listEyebrow="Brzi ulaz"
        listTitle="Interne uloge"
        listDescription="Konsultanti vode svoje klijente, menadzeri vode tim i transfere, a admin add-on otvara setup zonu."
        defaultPassword={getDemoPasswordForMode("staff")}
        accounts={data.staffUsers.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          secondary: `${user.title} · ${user.focus}`,
          tertiary: `Tim: ${user.team}`,
          badges: [
            {
              label: user.role === "manager" ? "Menadzer" : "Konsultant",
              tone: "accent",
            },
            ...(user.adminAddon
              ? [{ label: "Admin pristup", tone: "info" as const }]
              : []),
          ],
        }))}
      />
    </AppShell>
  );
}
