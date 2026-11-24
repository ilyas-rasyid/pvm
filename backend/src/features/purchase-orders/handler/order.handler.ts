import { Elysia } from "elysia";

import { orderRoles } from "../policy/access.policy";
import { findPurchaseOrderDetail } from "../repository/purchase-order.repository";
import { db } from "../../../infrastructure/database/prisma-client";
import { secureActor } from "../../../security/session";
import { assert } from "../../../shared/errors/app-error";
import { response, collection, pageParams } from "../../../shared/http/context";
import { attachEtag } from "../../../shared/http/version";
import { reason } from "../payload/order.schema";
import { createPo, issuePo, closePo, cancelPo, amendPo } from "../service";

export const orderRoutes = new Elysia()
  .get("/purchase-orders", async (ctx) => {
    const a = await secureActor(ctx, undefined, false);
    const p = pageParams(ctx.request);
    const where = {
      ...(a.role === "RECEIVING_OFFICER"
        ? {}
        : a.role === "EMPLOYEE"
          ? { request: { requesterId: a.id } }
          : {}),
      ...(p.status ? { status: p.status } : {}),
    };
    const [data, total] = await Promise.all([
      db.purchaseOrder.findMany({
        where,
        skip: p.skip,
        take: p.take,
        include: {
          vendor: { select: { name: true } },
          request: { select: { reference: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.purchaseOrder.count({ where }),
    ]);
    return collection(data, total, p.page, p.pageSize);
  })
  .get("/purchase-orders/:id", async (ctx) => {
    const a = await secureActor(ctx, undefined, false);
    const po = await findPurchaseOrderDetail(ctx.params.id);
    assert(
      a.role !== "EMPLOYEE" || po.request.requesterId === a.id,
      "ACCESS_DENIED",
      "Cannot access this order",
      403,
    );
    attachEtag(ctx, po.version);
    if (a.role === "RECEIVING_OFFICER") {
      return response({
        ...po,
        total: undefined,
        committed: undefined,
        versions: undefined,
        invoices: undefined,
        lines: po.lines.map((l) => ({
          ...l,
          price: undefined,
          taxRate: undefined,
          total: undefined,
        })),
      });
    }
    return response(po);
  })
  .post("/purchase-orders", async (ctx) => {
    const a = await secureActor(ctx, orderRoles);
    return response(await createPo(ctx, a));
  })
  .post("/purchase-orders/:id/amend", async (ctx) => {
    const a = await secureActor(ctx, orderRoles);
    return response(await amendPo(ctx, a, ctx.params.id));
  })
  .post("/purchase-orders/:id/issue", async (ctx) => {
    const a = await secureActor(ctx, orderRoles);
    return response(await issuePo(ctx, a, ctx.params.id));
  })
  .post("/purchase-orders/:id/cancel", async (ctx) => {
    const a = await secureActor(ctx, orderRoles);
    reason.parse(ctx.body);
    return response(await cancelPo(ctx, a, ctx.params.id));
  })
  .post("/purchase-orders/:id/close", async (ctx) => {
    const a = await secureActor(ctx, orderRoles);
    const { reason: why } = reason.parse(ctx.body);
    return response(await closePo(ctx, a, ctx.params.id, why));
  })
  .get("/purchase-orders/:id/versions", async (ctx) => {
    await secureActor(ctx, orderRoles, false);
    return response(
      await db.purchaseOrderVersion.findMany({
        where: { orderId: ctx.params.id },
        include: { lines: true },
        orderBy: { number: "desc" },
      }),
    );
  })
  .get("/purchase-orders/:id/receipts", async (ctx) => {
    await secureActor(ctx, undefined, false);
    return response(
      await db.goodsReceipt.findMany({
        where: { orderId: ctx.params.id },
        include: { lines: true },
      }),
    );
  })
  .get("/purchase-orders/:id/invoices", async (ctx) => {
    await secureActor(ctx, [...orderRoles, "FINANCE_OFFICER"], false);
    return response(await db.vendorInvoice.findMany({ where: { orderId: ctx.params.id } }));
  });
