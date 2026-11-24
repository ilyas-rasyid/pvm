import { Elysia } from "elysia";

import { db } from "../../../infrastructure/database/prisma-client";
import { AppError, assert } from "../../../shared/errors/app-error";
import { response } from "../../../shared/http/context";
import {
  checkOrigin,
  checkPreAuth,
  createSession,
  newPreAuth,
  currentSession,
  secureActor,
  random,
  sha,
  sessionCookie,
} from "../../../security/session";
import { loginSchema, changeSchema } from "../payload/auth.schema";
import { attempts } from "../policy/login-throttle";

export const authRoutes = new Elysia({ prefix: "/auth" })
  .get("/csrf", async (ctx) => {
    const existing = await currentSession(ctx.request);
    if (!existing) {
      return newPreAuth(ctx);
    }
    const csrf = random();
    await db.authSession.update({ where: { id: existing.id }, data: { csrfTokenHash: sha(csrf) } });
    ctx.set.headers["cache-control"] = "no-store";
    return response({ csrfToken: csrf, authenticated: true });
  })
  .post("/login", async (ctx) => {
    checkOrigin(ctx.request);
    checkPreAuth(ctx.request);
    const { email, password } = loginSchema.parse(ctx.body);
    const normalized = email.trim().toLowerCase();
    const key = `${normalized}:${ctx.request.headers.get("x-forwarded-for")?.slice(0, 64) || "local"}`;
    const rate = attempts.get(key);
    if (rate && rate.expires > Date.now() && rate.count >= 8) {
      throw new AppError("LOGIN_RATE_LIMITED", "Too many attempts. Try again later", 429);
    }
    const user = await db.user.findUnique({
      where: { email: normalized },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
    const ok = user && user.active && (await Bun.password.verify(password, user.passwordHash));
    if (!ok) {
      const count = rate && rate.expires > Date.now() ? rate.count + 1 : 1;
      attempts.set(key, { count, expires: Date.now() + 15 * 60000 });
      throw new AppError("INVALID_CREDENTIALS", "Email or password is incorrect", 401);
    }
    attempts.delete(key);
    await createSession(ctx, user.id);
    return response({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      department: user.department?.name ?? null,
      departmentName: user.department?.name ?? null,
      departmentCode: user.department?.code ?? null,
      mustChangePassword: user.mustChangePassword,
    });
  })
  .post("/logout", async (ctx) => {
    const actor = await secureActor(ctx);
    await db.authSession.update({
      where: { id: actor.sessionId },
      data: { revokedAt: new Date() },
    });
    ctx.set.headers["set-cookie"] = sessionCookie("").replace("Max-Age=28800", "Max-Age=0");
    return response({ ok: true });
  })
  .get("/me", async (ctx) => {
    const actor = await secureActor(ctx, undefined, false);
    const user = await db.user.findUniqueOrThrow({
      where: { id: actor.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        mustChangePassword: true,
      },
    });
    return response({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      department: user.department?.name ?? null,
      departmentName: user.department?.name ?? null,
      departmentCode: user.department?.code ?? null,
      mustChangePassword: user.mustChangePassword,
    });
  })
  .get("/sessions", async (ctx) => {
    const actor = await secureActor(ctx, undefined, false);
    const sessions = await db.authSession.findMany({
      where: { userId: actor.id, revokedAt: null, absoluteExpiresAt: { gt: new Date() } },
      select: { id: true, createdAt: true, lastSeenAt: true, absoluteExpiresAt: true },
      orderBy: { createdAt: "desc" },
    });
    return response(sessions.map((s) => ({ ...s, current: s.id === actor.sessionId })));
  })
  .delete("/sessions/:id", async (ctx) => {
    const actor = await secureActor(ctx);
    await db.authSession.updateMany({
      where: { id: ctx.params.id, userId: actor.id },
      data: { revokedAt: new Date() },
    });
    return response({ ok: true });
  })
  .post("/change-password", async (ctx) => {
    const actor = await secureActor(ctx);
    const { oldPassword, newPassword } = changeSchema.parse(ctx.body);
    const user = await db.user.findUniqueOrThrow({ where: { id: actor.id } });
    assert(
      await Bun.password.verify(oldPassword, user.passwordHash),
      "INVALID_CREDENTIALS",
      "Current password incorrect",
      422,
    );
    const hash = await Bun.password.hash(newPassword, {
      algorithm: "argon2id",
      memoryCost: 19456,
      timeCost: 2,
    });
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: actor.id },
        data: { passwordHash: hash, mustChangePassword: false },
      });
      await tx.authSession.updateMany({
        where: { userId: actor.id, id: { not: actor.sessionId } },
        data: { revokedAt: new Date() },
      });
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: "PASSWORD_CHANGED",
          resourceType: "User",
          resourceId: actor.id,
        },
      });
    });
    return response({ ok: true });
  });
