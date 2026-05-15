import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getClientById,
  getVisibleClientsForActor,
  getWorkspaceActor,
  loadAppData,
} from "@/lib/app-data";
import { canAccessAdmin, canTransferClients } from "@/lib/permissions";
import {
  ActorKind,
  AppData,
  Client,
  StaffUser,
  WorkspaceActor,
} from "@/lib/types";

const SESSION_COOKIE_NAME = "vlah_consultant_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const FALLBACK_SESSION_SECRET = "vlah-consultant-session-secret";
const FALLBACK_STAFF_PASSWORD = "consulting2026";
const FALLBACK_CLIENT_PASSWORD = "client2026";

type LoginMode = "staff" | "client";

type SessionPayload = {
  actorId: string;
  kind: ActorKind;
  issuedAt: number;
  expiresAt: number;
};

export class AuthApiError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.name = "AuthApiError";
    this.status = status;
  }
}

function getSessionSecret() {
  return process.env.SESSION_SECRET || FALLBACK_SESSION_SECRET;
}

function signTokenPart(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function encodePayload(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${signTokenPart(body)}`;
}

function decodePayload(token: string) {
  const [body, signature] = token.split(".");
  if (!body || !signature) {
    return null;
  }

  const expected = signTokenPart(body);
  const left = Buffer.from(signature, "utf8");
  const right = Buffer.from(expected, "utf8");

  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as SessionPayload;

    if (!payload?.actorId || !payload?.kind) {
      return null;
    }

    if (payload.expiresAt <= Date.now()) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function buildSessionPayload(actor: WorkspaceActor): SessionPayload {
  const issuedAt = Date.now();

  return {
    actorId: actor.id,
    kind: actor.kind,
    issuedAt,
    expiresAt: issuedAt + SESSION_MAX_AGE_SECONDS * 1000,
  };
}

export function getDemoPasswordForMode(mode: LoginMode) {
  return mode === "staff"
    ? process.env.STAFF_DEMO_PASSWORD || FALLBACK_STAFF_PASSWORD
    : process.env.CLIENT_DEMO_PASSWORD || FALLBACK_CLIENT_PASSWORD;
}

export function getActorHomeHref(actor: WorkspaceActor) {
  return `/workspace/${actor.id}`;
}

export function getLoginHrefForKind(kind: ActorKind) {
  return kind === "client" ? "/login/client" : "/login/staff";
}

async function findActorForCredentials(
  data: AppData,
  mode: LoginMode,
  email: string,
  password: string,
) {
  const normalizedEmail = email.trim().toLowerCase();
  const expectedPassword = getDemoPasswordForMode(mode);

  if (!normalizedEmail || password !== expectedPassword) {
    return null;
  }

  if (mode === "staff") {
    return (
      data.staffUsers.find((user) => user.email.trim().toLowerCase() === normalizedEmail) ??
      null
    );
  }

  return (
    data.clientPortalUsers.find(
      (user) => user.email.trim().toLowerCase() === normalizedEmail,
    ) ?? null
  );
}

export async function authenticateCredentials(input: {
  mode: LoginMode;
  email: string;
  password: string;
}) {
  const data = await loadAppData();
  return findActorForCredentials(data, input.mode, input.email, input.password);
}

export function applySessionCookie(response: {
  cookies: {
    set: (
      name: string,
      value: string,
      options: {
        httpOnly: boolean;
        sameSite: "lax";
        secure: boolean;
        path: string;
        maxAge: number;
      },
    ) => void;
  };
}, actor: WorkspaceActor) {
  response.cookies.set(SESSION_COOKIE_NAME, encodePayload(buildSessionPayload(actor)), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export function clearSessionCookie(response: {
  cookies: {
    set: (
      name: string,
      value: string,
      options: {
        httpOnly: boolean;
        sameSite: "lax";
        secure: boolean;
        path: string;
        expires: Date;
      },
    ) => void;
  };
}) {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export async function getAuthenticatedActor(data?: AppData) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const payload = decodePayload(token);
  if (!payload) {
    return null;
  }

  const resolvedData = data ?? (await loadAppData());
  const actor = getWorkspaceActor(resolvedData, payload.actorId);

  if (!actor || actor.kind !== payload.kind) {
    return null;
  }

  return actor;
}

export async function requireAuthenticatedActor(
  targetKind?: ActorKind,
): Promise<{ data: AppData; actor: WorkspaceActor }> {
  const data = await loadAppData();
  const actor = await getAuthenticatedActor(data);

  if (!actor) {
    redirect(getLoginHrefForKind(targetKind ?? "staff"));
  }

  if (targetKind && actor.kind !== targetKind) {
    redirect(getActorHomeHref(actor));
  }

  return { data, actor };
}

export async function requireWorkspaceAccess(
  actorId: string,
): Promise<{
  data: AppData;
  actor: WorkspaceActor | null;
  targetActor: WorkspaceActor | null;
}> {
  const data = await loadAppData();
  const targetActor = getWorkspaceActor(data, actorId);

  if (!targetActor) {
    return {
      data,
      actor: null,
      targetActor: null,
    };
  }

  const actor = await getAuthenticatedActor(data);
  if (!actor) {
    redirect(getLoginHrefForKind(targetActor.kind));
  }

  if (actor.id !== targetActor.id) {
    redirect(getActorHomeHref(actor));
  }

  return {
    data,
    actor,
    targetActor,
  };
}

export async function requireStaffWorkspace(): Promise<{
  data: AppData;
  actor: StaffUser;
}> {
  const { data, actor } = await requireAuthenticatedActor("staff");

  return {
    data,
    actor: actor as StaffUser,
  };
}

export async function requireStaffClientAccess(
  clientId: string,
): Promise<{
  data: AppData;
  actor: StaffUser;
  client: Client | null;
}> {
  const { data, actor } = await requireStaffWorkspace();
  const client = getClientById(data, clientId);

  if (!client) {
    return {
      data,
      actor,
      client: null,
    };
  }

  const visibleClientIds = new Set(
    getVisibleClientsForActor(data, actor).map((entry) => entry.id),
  );

  if (!visibleClientIds.has(clientId)) {
    redirect("/clients");
  }

  return {
    data,
    actor,
    client,
  };
}

export async function requireAdminApiAccess() {
  const { data, actor } = await requireStaffApiAccess();

  if (!canAccessAdmin(actor)) {
    throw new AuthApiError(
      "Admin setup je dostupan samo zaposlenom sa admin add-on pristupom.",
      403,
    );
  }

  return { data, actor };
}

export async function requireStaffApiAccess() {
  return resolveStaffApiActor();
}

export async function requireStaffApiClientAccess(
  clientId: string,
  options?: {
    managerOnly?: boolean;
  },
) {
  const { data, actor } = await resolveStaffApiActor();
  const client = getClientById(data, clientId);

  if (!client) {
    throw new AuthApiError("Klijent nije pronadjen.", 404);
  }

  const visibleClientIds = new Set(
    getVisibleClientsForActor(data, actor).map((entry) => entry.id),
  );

  if (!visibleClientIds.has(clientId)) {
    throw new AuthApiError(
      "Nemate pristup ovoj kartici klijenta.",
      403,
    );
  }

  if (options?.managerOnly && !canTransferClients(actor)) {
    throw new AuthApiError(
      "Samo menadzer moze da menja dodele eksperata na klijentu.",
      403,
    );
  }

  return { data, actor, client };
}

export function isAuthApiError(error: unknown): error is AuthApiError {
  return error instanceof AuthApiError;
}

async function resolveStaffApiActor() {
  const data = await loadAppData();
  const actor = await getAuthenticatedActor(data);

  if (!actor) {
    throw new AuthApiError("Morate biti prijavljeni da biste nastavili.", 401);
  }

  if (actor.kind !== "staff") {
    throw new AuthApiError(
      "Ova operacija je dostupna samo zaposlenima.",
      403,
    );
  }

  return {
    data,
    actor,
  };
}
