import { Elysia } from "elysia";

import { financeRoles } from "../policy/access.policy";
import { findInvoiceDetail } from "../repository/invoice.repository";
import { db } from "../../../infrastructure/database/prisma-client";
import { secureActor } from "../../../security/session";
import { response, collection, pageParams } from "../../../shared/http/context";
import { attachEtag } from "../../../shared/http/version";
import { reason } from "../payload/invoice.schema";
import { createInvoice, submitInvoice, matchInvoice, verifyInvoice, cancelInvoice, correctInvoice } from "../service";

export const invoiceRoutes = new Elysia()
  .get("/invoices", async (ctx) => {
    await secureActor(ctx, financeRoles, false);
    const p = pageParams(ctx.request);
    const where = {
      ...(p.status ? { status: p.status } : {}),
      ...(p.search ? { number: { contains: p.search, mode: "insensitive" as const } } : {}),
    };
    const [data, total] = await Promise.all([
      db.vendorInvoice.findMany({
        where,
        skip: p.skip,
        take: p.take,
        orderBy: { createdAt: "desc" },
        include: { vendor: { select: { name: true } }, order: { select: { reference: true } } },
      }),
      db.vendorInvoice.count({ where }),
    ]);
    return collection(data, total, p.page, p.pageSize);
  })
  .get("/invoices/:id", async (ctx) => {
    await secureActor(ctx, financeRoles, false);
    const invoice = await findInvoiceDetail(ctx.params.id);
    attachEtag(ctx, invoice.version);
    return response(invoice);
  })
  .post("/invoices", async (ctx) => {
    const a = await secureActor(ctx, financeRoles);
    return response(await createInvoice(ctx, a));
  })
  .patch("/invoices/:id", async (ctx) => {
    const a = await secureActor(ctx, financeRoles);
    return response(await correctInvoice(ctx, a, ctx.params.id));
  })
  .post("/invoices/:id/correct", async (ctx) => {
    const a = await secureActor(ctx, financeRoles);
    return response(await correctInvoice(ctx, a, ctx.params.id));
  })
  .post("/invoices/:id/submit", async (ctx) => {
    const a = await secureActor(ctx, financeRoles);
    return response(await submitInvoice(ctx, a, ctx.params.id));
  })
  .post("/invoices/:id/resubmit", async (ctx) => {
    const a = await secureActor(ctx, financeRoles);
    return response(await submitInvoice(ctx, a, ctx.params.id));
  })
  .post("/invoices/:id/match", async (ctx) => {
    const a = await secureActor(ctx, financeRoles);
    return response(await matchInvoice(ctx, a, ctx.params.id));
  })
  .post("/invoices/:id/final-verify", async (ctx) => {
    const a = await secureActor(ctx, financeRoles);
    return response(await verifyInvoice(ctx, a, ctx.params.id));
  })
  .post("/invoices/:id/cancel", async (ctx) => {
    const a = await secureActor(ctx, financeRoles);
    reason.parse(ctx.body);
    return response(await cancelInvoice(ctx, a, ctx.params.id));
  })
  .get("/finance/matching-queue", async (ctx) => {
    await secureActor(ctx, financeRoles, false);
    return response(
      await db.vendorInvoice.findMany({
        where: { status: { in: ["SUBMITTED", "MATCHED"] } },
        include: { vendor: true },
        orderBy: { createdAt: "asc" },
      }),
    );
  })
  .get("/finance/discrepancies", async (ctx) => {
    await secureActor(ctx, financeRoles, false);
    return response(
      await db.vendorInvoice.findMany({
        where: { status: "DISCREPANCY" },
        include: {
          vendor: true,
          matches: { take: 1, orderBy: { createdAt: "desc" }, include: { discrepancies: true } },
        },
      }),
    );
  })
  .get("/finance/ready-for-payment", async (ctx) => {
    await secureActor(ctx, financeRoles, false);
    return response(
      await db.vendorInvoice.findMany({
        where: { status: "READY_FOR_PAYMENT" },
        include: { vendor: true },
        orderBy: { readyAt: "desc" },
      }),
    );
  });
