import { WorkspaceActor } from "@/lib/types";

export function canAccessAdmin(actor: WorkspaceActor) {
  return actor.kind === "staff" && actor.adminAddon;
}

export function canTransferClients(actor: WorkspaceActor) {
  return actor.kind === "staff" && actor.role === "manager";
}
