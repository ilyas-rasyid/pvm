import { Elysia } from "elysia";
import { db } from "../../infrastructure/database/prisma-client";
import { secureActor } from "../../security/session";
import { assert } from "../../shared/errors/app-error";
import { response, collection, pageParams } from "../../shared/http/context";
import { attachEtag } from "../../shared/http/version";
import { reason } from "./order.schemas";
import { createPo, issuePo, closePo, cancelPo, amendPo } from "./order.service";

const roles = ["PROCUREMENT_OFFICER", "ADMIN"];
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
    const po = await db.purchaseOrder.findUniqueOrThrow({
      where: { id: ctx.params.id },
      include: {
        vendor: true,
        request: true,
        lines: { include: { requestLine: true } },
        versions: { include: { lines: true } },
        receipts: { select: { id: true, reference: true, status: true } },
        invoices: { select: { id: true, number: true, status: true, total: true } },
      },
    });
    assert(
      a.role !== "EMPLOYEE" || po.request.requesterId === a.id,
      "ACCESS_DENIED",
      "Cannot access this order",
      403,
    );
    attachEtag(ctx, po.version);
    if (a.role === "RECEIVING_OFFICER")
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
    return response(po);
  })
  .post("/purchase-orders", async (ctx) => {
    const a = await secureActor(ctx, roles);
    return response(await createPo(ctx, a));
  })
  .post("/purchase-orders/:id/amend", async (ctx) => {
    const a = await secureActor(ctx, roles);
    return response(await amendPo(ctx, a, ctx.params.id));
  })
  .post("/purchase-orders/:id/issue", async (ctx) => {
    const a = await secureActor(ctx, roles);
    return response(await issuePo(ctx, a, ctx.params.id));
  })
  .post("/purchase-orders/:id/cancel", async (ctx) => {
    const a = await secureActor(ctx, roles);
    reason.parse(ctx.body);
    return response(await cancelPo(ctx, a, ctx.params.id));
  })
  .post("/purchase-orders/:id/close", async (ctx) => {
    const a = await secureActor(ctx, roles);
    const { reason: why } = reason.parse(ctx.body);
    return response(await closePo(ctx, a, ctx.params.id, why));
  })
  .get("/purchase-orders/:id/versions", async (ctx) => {
    await secureActor(ctx, roles, false);
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
    await secureActor(ctx, [...roles, "FINANCE_OFFICER"], false);
    return response(await db.vendorInvoice.findMany({ where: { orderId: ctx.params.id } }));
  });
