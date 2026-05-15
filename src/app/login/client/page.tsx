import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { LoginPanel } from "@/components/login-panel";
import { getClientById, getProgramById, loadAppData } from "@/lib/app-data";
import { getActorHomeHref, getAuthenticatedActor, getDemoPasswordForMode } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ClientLoginPage() {
  const data = await loadAppData();
  const actor = await getAuthenticatedActor(data);

  if (actor) {
    redirect(getActorHomeHref(actor));
  }

  return (
    <AppShell>
      <LoginPanel
        mode="client"
        introEyebrow="Klijenti"
        introTitle="Ulaz u portal klijenta"
        introDescription="Klijent vidi samo svoju karticu, svoje akcije, svoje sastanke i materijale koji su mu podeljeni."
        listEyebrow="Brzi ulaz"
        listTitle="Portali klijenata"
        listDescription="Svaki portal je odvojen i vodi samo na program i evidenciju tog klijenta."
        defaultPassword={getDemoPasswordForMode("client")}
        accounts={data.clientPortalUsers.map((user) => {
          const client = getClientById(data, user.clientId);
          const program = client ? getProgramById(data, client.programId) : null;

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            secondary: user.company,
            tertiary: `Program: ${program?.name ?? "nije povezano"}`,
            badges: [
              { label: "Portal klijenta", tone: "success" as const },
              ...(client ? [{ label: client.stage, tone: "neutral" as const }] : []),
            ],
          };
        })}
      />
    </AppShell>
  );
}
