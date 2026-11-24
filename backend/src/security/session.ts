import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { db } from "../infrastructure/database/prisma-client";
import { env } from "../config/env";
import { AppError, assert } from "../shared/errors/app-error";
import type { Actor, RouteContext } from "../shared/http/context";

export const sha = (value: string) => createHash("sha256").update(value).digest("hex");
export const random = () => randomBytes(32).toString("base64url");
const secure = env.COOKIE_SECURE === "true";
const sidName = secure ? "__Host-pvms_sid" : "pvms_sid_dev";
const preName = secure ? "__Host-pvms_pre" : "pvms_pre_dev";

export function cookieValue(request: Request, name: string): string | undefined {
  const cookie = request.headers.get("cookie") || "";
  return cookie
    .split(";")
    .map((x) => x.trim())
    .find((x) => x.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}
export function makeCookie(name: string, value: string, maxAge: number) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}
export function sessionCookie(token: string) {
  return makeCookie(sidName, token, 8 * 3600);
}
export function preCookie(token: string) {
  return makeCookie(preName, token, 600);
}
export function sessionToken(request: Request) {
  return cookieValue(request, sidName);
}
export function preToken(request: Request) {
  return cookieValue(request, preName);
}

const anonymousCsrf = new Map<
  string,
  {
    hash: string;
    expires: number;
  }
>();
export function newPreAuth(ctx: RouteContext) {
  const id = random();
  const csrf = random();
  anonymousCsrf.set(sha(id), { hash: sha(csrf), expires: Date.now() + 600000 });
  ctx.set.headers["set-cookie"] = preCookie(id);
  ctx.set.headers["cache-control"] = "no-store";
  return { data: { csrfToken: csrf, authenticated: false } };
}
export function checkPreAuth(request: Request) {
  const id = preToken(request);
  const csrf = request.headers.get("x-csrf-token");
  const entry = id ? anonymousCsrf.get(sha(id)) : undefined;
  assert(
    entry && entry.expires > Date.now() && csrf && sha(csrf) === entry.hash,
    "CSRF_INVALID",
    "Invalid login security context",
    403,
  );
  anonymousCsrf.delete(sha(id!));
}

export async function currentSession(request: Request) {
  const token = sessionToken(request);
  if (!token) {
    return null;
  }
  const session = await db.authSession.findUnique({
    where: { tokenHash: sha(token) },
    include: { user: true },
  });
  if (
    !session ||
    session.revokedAt ||
    !session.user.active ||
    session.idleExpiresAt <= new Date() ||
    session.absoluteExpiresAt <= new Date()
  ) {
    return null;
  }
  if (Date.now() - session.lastSeenAt.getTime() > 5 * 60000) {
    const nextIdle = new Date(
      Math.min(Date.now() + 30 * 60000, session.absoluteExpiresAt.getTime()),
    );
    await db.authSession.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { lastSeenAt: new Date(), idleExpiresAt: nextIdle },
    });
  }
  return session;
}

export async function actorFrom(request: Request): Promise<Actor> {
  const session = await currentSession(request);
  if (!session) {
    throw new AppError("AUTH_REQUIRED", "Please log in", 401);
  }
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    departmentId: session.user.departmentId,
    sessionId: session.id,
  };
}

export function checkOrigin(request: Request) {
  assert(
    request.headers.get("origin") === env.APP_ORIGIN,
    "ORIGIN_NOT_ALLOWED",
    "Origin not allowed",
    403,
  );
}
export async function checkCsrf(request: Request) {
  checkOrigin(request);
  const session = await currentSession(request);
  if (!session) {
    throw new AppError("AUTH_REQUIRED", "Please log in", 401);
  }
  const value = request.headers.get("x-csrf-token") || "";
  const incoming = Buffer.from(sha(value));
  const expected = Buffer.from(session.csrfTokenHash);
  assert(
    value.length > 0 && incoming.length === expected.length && timingSafeEqual(incoming, expected),
    "CSRF_INVALID",
    "Security token expired or invalid",
    403,
  );
}
export async function secureActor(ctx: RouteContext, roles?: string[], unsafe = true) {
  if (unsafe) {
    await checkCsrf(ctx.request);
  }
  const actor = await actorFrom(ctx.request);
  if (roles && !roles.includes(actor.role)) {
    throw new AppError("ACCESS_DENIED", "Not permitted", 403);
  }
  return actor;
}

export async function createSession(ctx: RouteContext, userId: string) {
  const token = random();
  const csrf = random();
  const now = Date.now();
  await db.$transaction(async (tx) => {
    const active = await tx.authSession.findMany({
      where: { userId, revokedAt: null, absoluteExpiresAt: { gt: new Date() } },
      orderBy: { createdAt: "asc" },
    });
    for (const old of active.slice(0, Math.max(0, active.length - 4))) {
      await tx.authSession.update({ where: { id: old.id }, data: { revokedAt: new Date() } });
    }
    await tx.authSession.create({
      data: {
        userId,
        tokenHash: sha(token),
        csrfTokenHash: sha(csrf),
        idleExpiresAt: new Date(now + 30 * 60000),
        absoluteExpiresAt: new Date(now + 8 * 3600000),
      },
    });
  });
  ctx.set.headers["set-cookie"] = sessionCookie(token);
  return csrf;
}
