import { Elysia } from "elysia";
import { z } from "zod";

import { sourcingRoles } from "../policy/access.policy";
import { findRfqDetail } from "../repository/rfq.repository";
import { db } from "../../../infrastructure/database/prisma-client";
import { secureActor } from "../../../security/session";
import { response, collection, pageParams } from "../../../shared/http/context";
import { attachEtag } from "../../../shared/http/version";
import { command, event } from "../../../shared/transactions/transaction";
import { assert } from "../../../shared/errors/app-error";
import { createRfq, rfqAction, recordQuotation, awardRfq, reviseQuotation } from "../service";

export const sourcingRoutes = new Elysia()
  .get("/rfqs", async (ctx) => {
    await secureActor(ctx, sourcingRoles, false);
    const p = pageParams(ctx.request);
    const [data, total] = await Promise.all([
      db.rfq.findMany({
        skip: p.skip,
        take: p.take,
        orderBy: { createdAt: "desc" },
        include: { request: { select: { reference: true, title: true } } },
      }),
      db.rfq.count(),
    ]);
    return collection(data, total, p.page, p.pageSize);
  })
  .get("/rfqs/:id", async (ctx) => {
    await secureActor(ctx, sourcingRoles, false);
    const rfq = await findRfqDetail(ctx.params.id);
    attachEtag(ctx, rfq.version);
    return response(rfq);
  })
  .get("/rfqs/:id/comparison", async (ctx) => {
    await secureActor(ctx, sourcingRoles, false);
    return response(
      await db.rfq.findUniqueOrThrow({
        where: { id: ctx.params.id },
        include: {
          lines: { include: { requestLine: true } },
          quotations: {
            include: {
              vendor: true,
              revisions: { orderBy: { number: "desc" }, take: 1, include: { lines: true } },
            },
          },
        },
      }),
    );
  })
  .post("/rfqs", async (ctx) => {
    const a = await secureActor(ctx, sourcingRoles);
    return response(await createRfq(ctx, a));
  })
  .post("/rfqs/:id/record-quotation", async (ctx) => {
    const a = await secureActor(ctx, sourcingRoles);
    return response(await recordQuotation(ctx, a, ctx.params.id));
  })
  .post("/rfqs/:id/quotations/:quoteId/revisions", async (ctx) => {
    const a = await secureActor(ctx, sourcingRoles);
    return response(await reviseQuotation(ctx, a, ctx.params.id, ctx.params.quoteId));
  })
  .post("/rfqs/:id/award", async (ctx) => {
    const a = await secureActor(ctx, sourcingRoles);
    return response(await awardRfq(ctx, a, ctx.params.id));
  })
  .post("/rfqs/:id/:action", async (ctx) => {
    const a = await secureActor(ctx, sourcingRoles);
    const action = ctx.params.action;
    assert(
      ["open", "evaluate", "cancel"].includes(action),
      "INVALID_ACTION",
      "Unknown RFQ action",
      404,
    );
    return response(await rfqAction(ctx, a, ctx.params.id, action));
  })
  .get("/procurement/direct-purchase-policy", async (ctx) => {
    await secureActor(ctx, sourcingRoles, false);
    return response(await db.procurementPolicy.findFirst({ orderBy: { version: "desc" } }));
  })
  .post("/direct-purchase-exceptions", async (ctx) => {
    const a = await secureActor(ctx, sourcingRoles);
    const form = z
      .object({ requestId: z.uuid(), vendorId: z.uuid(), reason: z.string().min(10) })
      .strict()
      .parse(ctx.body);
    return response(
      await command(ctx, a, "direct.exception.create", async (tx) => {
        const policy = await tx.procurementPolicy.findFirst({ orderBy: { version: "desc" } });
        assert(
          policy?.directPurchaseEnabled,
          "DIRECT_PURCHASE_DISABLED",
          "Direct purchase not enabled",
        );
        const request = await tx.purchaseRequest.findUniqueOrThrow({
          where: { id: form.requestId },
        });
        const vendor = await tx.vendor.findUniqueOrThrow({ where: { id: form.vendorId } });
        assert(
          request.status === "APPROVED" && vendor.active,
          "DIRECT_PURCHASE_INVALID",
          "Invalid source PR or vendor",
        );
        const x = await tx.directPurchaseException.create({
          data: {
            ...form,
            createdBy: a.id,
            policyVersion: policy.version,
            threshold: policy.directPurchaseThreshold,
          },
        });
        await event(tx, a, "DIRECT_PURCHASE_RECORDED", "DirectPurchaseException", x.id);
        return x;
      }),
    );
  });
