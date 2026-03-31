import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";

export default function NotFound() {
  return (
    <AppShell>
      <SectionCard
        eyebrow="404"
        title="Taj klijent ne postoji u demo bazi"
        description="Vrati se na listu klijenata i izaberi neki od profila koji su trenutno ucitani u prototype."
      >
        <Link
          href="/clients"
          className="brand-button"
        >
          Nazad na bazu klijenata
        </Link>
      </SectionCard>
    </AppShell>
  );
}
