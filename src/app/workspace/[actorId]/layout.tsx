import { notFound } from "next/navigation";
import { WorkspaceShell } from "@/components/workspace-shell";
import { requireWorkspaceAccess } from "@/lib/auth";
import {
  getNavigationForActor,
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
  const { data, targetActor: actor } = await requireWorkspaceAccess(actorId);

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
