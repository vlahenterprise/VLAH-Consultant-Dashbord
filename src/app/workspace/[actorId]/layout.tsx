import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import {
  getNavigationForActor,
  getWorkspaceActor,
} from "@/lib/mock-data";

type WorkspaceLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ actorId: string }>;
};

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const { actorId } = await params;
  const actor = getWorkspaceActor(actorId);

  if (!actor) {
    notFound();
  }

  return (
    <WorkspaceShell actor={actor} navigation={getNavigationForActor(actor)}>
      {children}
    </WorkspaceShell>
  );
}
