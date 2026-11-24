import { Elysia } from "elysia";

import { findRequestDetail } from "../repository/request.repository";
import { db } from "../../../infrastructure/database/prisma-client";
import { secureActor } from "../../../security/session";
import { assert } from "../../../shared/errors/app-error";
import { pageParams, collection, response } from "../../../shared/http/context";
import { attachEtag } from "../../../shared/http/version";
import { reasonForm } from "../payload/request.schema";
import { canReadRequest, saveRequest, transitionRequest } from "../service";

export const requestRoutes = new Elysia()
  .get("/purchase-requests", async (ctx) => {
    const a = await secureActor(ctx, undefined, false);
    const p = pageParams(ctx.request);
    const visibility =
      a.role === "ADMIN" || ["PROCUREMENT_OFFICER", "FINANCE_OFFICER"].includes(a.role)
        ? {}
        : a.role === "DEPARTMENT_MANAGER"
          ? { departmentId: a.departmentId || "" }
          : { requesterId: a.id };
    const where = {
      ...visibility,
      ...(p.status ? { status: p.status } : {}),
      ...(p.search
        ? {
          OR: [
            { reference: { contains: p.search, mode: "insensitive" as const } },
            { title: { contains: p.search, mode: "insensitive" as const } },
          ],
        }
        : {}),
    };
    const [data, total] = await Promise.all([
      db.purchaseRequest.findMany({
        where,
        skip: p.skip,
        take: p.take,
        orderBy: { createdAt: "desc" },
        include: { requester: { select: { name: true } } },
      }),
      db.purchaseRequest.count({ where }),
    ]);
    return collection(data, total, p.page, p.pageSize);
  })
  .get("/my/purchase-requests", async (ctx) => {
    const a = await secureActor(ctx, undefined, false);
    const p = pageParams(ctx.request);
    const [data, total] = await Promise.all([
      db.purchaseRequest.findMany({
        where: { requesterId: a.id },
        skip: p.skip,
        take: p.take,
        orderBy: { createdAt: "desc" },
      }),
      db.purchaseRequest.count({ where: { requesterId: a.id } }),
    ]);
    return collection(data, total, p.page, p.pageSize);
  })
  .get("/purchase-requests/:id", async (ctx) => {
    const a = await secureActor(ctx, undefined, false);
    const r = await findRequestDetail(ctx.params.id);
    assert(canReadRequest(a, r), "ACCESS_DENIED", "Not authorized", 403);
    attachEtag(ctx, r.version);
    return response(r);
  })
  .post("/purchase-requests", async (ctx) => {
    const a = await secureActor(ctx);
    return response(await saveRequest(ctx, a));
  })
  .patch("/purchase-requests/:id", async (ctx) => {
    const a = await secureActor(ctx);
    return response(await saveRequest(ctx, a, ctx.params.id));
  })
  .post("/purchase-requests/:id/:action", async (ctx) => {
    const a = await secureActor(ctx);
    const action = ctx.params.action;
    assert(
      ["submit", "withdraw", "cancel", "approve", "reject"].includes(action),
      "INVALID_ACTION",
      "Unknown request action",
      404,
    );
    const reason = action === "reject" ? reasonForm.parse(ctx.body).reason : undefined;
    return response(await transitionRequest(ctx, a, ctx.params.id, action, reason));
  })
  .get("/approvals/queue", async (ctx) => {
    const a = await secureActor(ctx, ["DEPARTMENT_MANAGER", "ADMIN"], false);
    const where = {
      status: "SUBMITTED",
      ...(a.role === "ADMIN" ? {} : { department: { managerId: a.id } }),
      requesterId: { not: a.id },
    };
    return response(
      await db.purchaseRequest.findMany({
        where,
        include: { requester: { select: { name: true } }, lines: true },
        orderBy: { submittedAt: "asc" },
      }),
    );
  })
  .get("/procurement/queue", async (ctx) => {
    await secureActor(ctx, ["PROCUREMENT_OFFICER", "ADMIN"], false);
    return response(
      await db.purchaseRequest.findMany({
        where: { status: "APPROVED" },
        include: { lines: true },
        orderBy: { approvedAt: "desc" },
      }),
    );
  });
