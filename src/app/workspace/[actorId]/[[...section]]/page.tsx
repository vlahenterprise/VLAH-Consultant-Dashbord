import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkspaceView } from "@/components/workspace-view";
import { getWorkspaceActor, loadAppData } from "@/lib/app-data";
import { WorkspaceSection } from "@/lib/types";

type WorkspacePageProps = {
  params: Promise<{ actorId: string; section?: string[] }>;
};

const staffSections: WorkspaceSection[] = [
  "overview",
  "clients",
  "analytics",
  "programs",
  "team",
  "admin",
];

const clientSections: WorkspaceSection[] = [
  "overview",
  "meetings",
  "analytics",
  "resources",
];

function normalizeSection(rawSection?: string[]) {
  const value = rawSection?.[0] ?? "overview";

  if (
    value === "overview" ||
    value === "clients" ||
    value === "analytics" ||
    value === "programs" ||
    value === "team" ||
    value === "admin" ||
    value === "meetings" ||
    value === "resources"
  ) {
    return value;
  }

  return null;
}

export async function generateMetadata({
  params,
}: WorkspacePageProps): Promise<Metadata> {
  const { actorId, section } = await params;
  const data = await loadAppData();
  const actor = getWorkspaceActor(data, actorId);
  const normalized = normalizeSection(section);

  if (!actor || !normalized) {
    return {
      title: "Workspace nije pronadjen",
    };
  }

  return {
    title: `${actor.name} · ${normalized}`,
  };
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { actorId, section } = await params;
  const data = await loadAppData();
  const actor = getWorkspaceActor(data, actorId);
  const normalized = normalizeSection(section);

  if (!actor || !normalized) {
    notFound();
  }

  const allowedSections =
    actor.kind === "client" ? clientSections : staffSections;

  if (!allowedSections.includes(normalized)) {
    notFound();
  }

  return <WorkspaceView actor={actor} section={normalized} data={data} />;
}
