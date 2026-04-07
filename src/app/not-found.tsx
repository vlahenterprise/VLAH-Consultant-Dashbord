import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { SectionCard } from "@/components/section-card";

export default function NotFound() {
  return (
    <AppShell>
      <SectionCard
        eyebrow="404"
        title="Klijent nije pronadjen"
        description="Vrati se na bazu klijenata i izaberi postojeci profil."
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
