import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import {
  getNavigationForActor,
  getWorkspaceActor,
  loadAppData,
} from "@/lib/app-data";

type WorkspaceLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ actorId: string }>;
};

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const { actorId } = await params;
  const data = await loadAppData();
  const actor = getWorkspaceActor(data, actorId);

  if (!actor) {
    notFound();
  }

  return (
    <WorkspaceShell
      actor={actor}
      navigation={getNavigationForActor(data, actor)}
    >
      {children}
    </WorkspaceShell>
  );
}
