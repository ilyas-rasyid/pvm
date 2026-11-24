import { z } from "zod";
import { Elysia } from "elysia";

import { db } from "../../../infrastructure/database/prisma-client";
import { secureActor } from "../../../security/session";
import { assert } from "../../../shared/errors/app-error";
import { pageParams, collection, response } from "../../../shared/http/context";
import { command, event } from "../../../shared/transactions/transaction";
import { createUser, updateUser, department } from "../payload/admin.schema";
import { profile } from "../repository/user-projection";

export const adminRoutes = new Elysia({ prefix: "/admin" })
  .get("/users", async (ctx) => {
    await secureActor(ctx, ["ADMIN"], false);
    const p = pageParams(ctx.request);
    const where = {
      ...(p.search
        ? {
          OR: [
            { name: { contains: p.search, mode: "insensitive" as const } },
            { email: { contains: p.search, mode: "insensitive" as const } },
          ],
        }
        : {}),
    };
    const [data, total] = await Promise.all([
      db.user.findMany({
        where,
        skip: p.skip,
        take: p.take,
        orderBy: { createdAt: "desc" },
        select: profile,
      }),
      db.user.count({ where }),
    ]);
    return collection(data, total, p.page, p.pageSize);
  })
  .get("/users/:id", async (ctx) => {
    await secureActor(ctx, ["ADMIN"], false);
    return response(
      await db.user.findUniqueOrThrow({ where: { id: ctx.params.id }, select: profile }),
    );
  })
  .post("/users", async (ctx) => {
    const actor = await secureActor(ctx, ["ADMIN"]);
    const form = createUser.parse(ctx.body);
    return response(
      await command(ctx, actor, "admin.user.create", async (tx) => {
        const org = await tx.organization.findFirstOrThrow();
        const user = await tx.user.create({
          data: {
            organizationId: org.id,
            name: form.name,
            email: form.email.toLowerCase().trim(),
            role: form.role,
            departmentId: form.departmentId || null,
            passwordHash: await Bun.password.hash(form.password, {
              algorithm: "argon2id",
              memoryCost: 19456,
              timeCost: 2,
            }),
            mustChangePassword: true,
          },
          select: profile,
        });
        await event(tx, actor, "USER_CREATED", "User", user.id);
        return user;
      }),
    );
  })
  .patch("/users/:id", async (ctx) => {
    const actor = await secureActor(ctx, ["ADMIN"]);
    const form = updateUser.parse(ctx.body);
    return response(
      await command(ctx, actor, `admin.user.update.${ctx.params.id}`, async (tx) => {
        const old = await tx.user.findUniqueOrThrow({ where: { id: ctx.params.id } });
        if (old.role === "ADMIN" && form.role && form.role !== "ADMIN") {
          const count = await tx.user.count({ where: { role: "ADMIN", active: true } });
          assert(count > 1, "LAST_ACTIVE_ADMIN", "Cannot remove final active Admin");
        }
        const user = await tx.user.update({
          where: { id: ctx.params.id },
          data: form,
          select: profile,
        });
        await tx.authSession.updateMany({
          where: { userId: user.id },
          data: { revokedAt: new Date() },
        });
        await event(tx, actor, "USER_UPDATED", "User", user.id);
        return user;
      }),
    );
  })
  .post("/users/:id/:action", async (ctx) => {
    const actor = await secureActor(ctx, ["ADMIN"]);
    const action = ctx.params.action;
    assert(
      ["deactivate", "reactivate", "revoke-sessions", "reset-password"].includes(action),
      "INVALID_ACTION",
      "Unknown user action",
      404,
    );
    const payload = z
      .object({ password: z.string().min(15).max(128).optional() })
      .strict()
      .parse(ctx.body || {});
    return response(
      await command(ctx, actor, `admin.user.${action}.${ctx.params.id}`, async (tx) => {
        const user = await tx.user.findUniqueOrThrow({ where: { id: ctx.params.id } });
        if (action === "deactivate" && user.role === "ADMIN") {
          assert(
            (await tx.user.count({ where: { role: "ADMIN", active: true } })) > 1,
            "LAST_ACTIVE_ADMIN",
            "Cannot deactivate final Admin",
          );
        }
        if (action === "reset-password") {
          assert(payload.password, "PASSWORD_REQUIRED", "Temporary password required", 422);
          await tx.user.update({
            where: { id: user.id },
            data: {
              passwordHash: await Bun.password.hash(payload.password!, { algorithm: "argon2id" }),
              mustChangePassword: true,
            },
          });
        }
        if (action === "deactivate" || action === "reactivate") {
          await tx.user.update({
            where: { id: user.id },
            data: { active: action === "reactivate" },
          });
        }
        await tx.authSession.updateMany({
          where: { userId: user.id },
          data: { revokedAt: new Date() },
        });
        await event(tx, actor, `USER_${action.toUpperCase()}`, "User", user.id);
        return { ok: true };
      }),
    );
  })
  .get("/departments", async (ctx) => {
    await secureActor(ctx, ["ADMIN"], false);
    return response(
      await db.department.findMany({
        orderBy: { name: "asc" },
        include: { manager: { select: profile } },
      }),
    );
  })
  .post("/departments", async (ctx) => {
    const actor = await secureActor(ctx, ["ADMIN"]);
    const form = department.parse(ctx.body);
    return response(
      await command(ctx, actor, "department.create", async (tx) => {
        const org = await tx.organization.findFirstOrThrow();
        const result = await tx.department.create({ data: { ...form, organizationId: org.id } });
        await event(tx, actor, "DEPARTMENT_CREATED", "Department", result.id);
        return result;
      }),
    );
  })
  .patch("/departments/:id", async (ctx) => {
    const actor = await secureActor(ctx, ["ADMIN"]);
    const form = department.partial().parse(ctx.body);
    return response(
      await command(ctx, actor, `department.update.${ctx.params.id}`, async (tx) => {
        const result = await tx.department.update({ where: { id: ctx.params.id }, data: form });
        await event(tx, actor, "DEPARTMENT_UPDATED", "Department", result.id);
        return result;
      }),
    );
  })
  .get("/audit-logs", async (ctx) => {
    await secureActor(ctx, ["ADMIN"], false);
    const p = pageParams(ctx.request);
    const [data, total] = await Promise.all([
      db.auditLog.findMany({ skip: p.skip, take: p.take, orderBy: { createdAt: "desc" } }),
      db.auditLog.count(),
    ]);
    return collection(data, total, p.page, p.pageSize);
  });
