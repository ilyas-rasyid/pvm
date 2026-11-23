import { Elysia } from "elysia";
import { db } from "../../infrastructure/database/prisma-client";
import { secureActor } from "../../security/session";
import { response } from "../../shared/http/context";
import { money, available } from "../../shared/finance/money";
import { assert } from "../../shared/errors/app-error";

const reportRoles = ["ADMIN", "PROCUREMENT_OFFICER", "FINANCE_OFFICER", "DEPARTMENT_MANAGER"];
function csvEscape(value: unknown) {
  const valueString = String(value ?? "");
  const safe = /^[=+@\-\t\r]/.test(valueString) ? `'${valueString}` : valueString;
  return `"${safe.replace(/"/g, '""')}"`;
}
export const reportsRoutes = new Elysia()
  .get("/dashboard/summary", async (ctx) => {
    const actor = await secureActor(ctx, undefined, false);
    if (actor.role === "EMPLOYEE") {
      const [draft, pending, approved] = await Promise.all([
        db.purchaseRequest.count({ where: { requesterId: actor.id, status: "DRAFT" } }),
        db.purchaseRequest.count({ where: { requesterId: actor.id, status: "SUBMITTED" } }),
        db.purchaseRequest.count({ where: { requesterId: actor.id, status: "APPROVED" } }),
      ]);
      return response({ draft, pending, approved });
    }
    if (actor.role === "RECEIVING_OFFICER")
      return response({
        expected: await db.purchaseOrder.count({
          where: { status: { in: ["ISSUED", "PARTIALLY_RECEIVED"] } },
        }),
        posted: await db.goodsReceipt.count({ where: { status: "POSTED" } }),
      });
    if (actor.role === "FINANCE_OFFICER")
      return response({
        unmatched: await db.vendorInvoice.count({ where: { status: "SUBMITTED" } }),
        discrepancies: await db.vendorInvoice.count({ where: { status: "DISCREPANCY" } }),
        ready: await db.vendorInvoice.count({ where: { status: "READY_FOR_PAYMENT" } }),
      });
    if (actor.role === "DEPARTMENT_MANAGER")
      return response({
        pending: await db.purchaseRequest.count({
          where: { department: { managerId: actor.id }, status: "SUBMITTED" },
        }),
        approved: await db.purchaseRequest.count({
          where: { department: { managerId: actor.id }, status: "APPROVED" },
        }),
      });
    return response({
      requests: await db.purchaseRequest.count(),
      rfqs: await db.rfq.count(),
      orders: await db.purchaseOrder.count(),
      vendors: await db.vendor.count(),
    });
  })
  .get("/reports/:kind", async (ctx) => {
    const a = await secureActor(ctx, reportRoles, false);
    const kind = ctx.params.kind;
    const scope =
      a.role === "DEPARTMENT_MANAGER" ? { costCenter: { department: { managerId: a.id } } } : {};
    if (kind === "budgets") {
      const rows = await db.budgetAccount.findMany({
        where: scope,
        include: { costCenter: true, fiscalPeriod: true },
      });
      return response(
        rows.map((x) => ({
          code: x.costCenter.code,
          period: x.fiscalPeriod.code,
          allocated: x.allocated,
          committed: x.committed,
          verified: x.verified,
          available: money(
            available(x.allocated.toString(), x.committed.toString(), x.verified.toString()),
          ),
        })),
      );
    }
    if (kind === "purchase-requests")
      return response(
        await db.purchaseRequest.findMany({
          where: a.role === "DEPARTMENT_MANAGER" ? { department: { managerId: a.id } } : {},
          take: 500,
          orderBy: { createdAt: "desc" },
        }),
      );
    if (kind === "procurement")
      return response(
        await db.purchaseOrder.findMany({
          where:
            a.role === "DEPARTMENT_MANAGER"
              ? { costCenter: { department: { managerId: a.id } } }
              : {},
          take: 500,
          orderBy: { createdAt: "desc" },
        }),
      );
    if (kind === "invoices")
      assert(a.role !== "DEPARTMENT_MANAGER", "ACCESS_DENIED", "Not permitted", 403);
    if (kind === "invoices")
      return response(
        await db.vendorInvoice.findMany({ take: 500, orderBy: { createdAt: "desc" } }),
      );
    if (kind === "receiving")
      return response(
        await db.goodsReceipt.findMany({ take: 500, orderBy: { receivedAt: "desc" } }),
      );
    if (kind === "vendors") return response(await db.vendor.findMany({ take: 500 }));
    assert(false, "REPORT_NOT_FOUND", "Unknown report", 404);
  })
  .get("/reports/:kind/export", async (ctx) => {
    const actor = await secureActor(ctx, reportRoles, false);
    const kind = ctx.params.kind;
    assert(
      ["purchase-requests", "procurement", "invoices", "receiving", "vendors", "budgets"].includes(
        kind,
      ),
      "REPORT_NOT_FOUND",
      "Unknown report",
      404,
    );
    if (actor.role === "DEPARTMENT_MANAGER")
      assert(
        ["purchase-requests", "procurement", "budgets"].includes(kind),
        "ACCESS_DENIED",
        "Not authorized",
        403,
      );
    const url = new URL(ctx.request.url);
    url.pathname = `/api/v1/reports/${kind}`;
    // Export uses the same scope as the report, without truncating silently: cap explicitly.
    let records: Record<string, unknown>[] = [];
    if (kind === "vendors") records = await db.vendor.findMany({ take: 1000 });
    else if (kind === "invoices") records = await db.vendorInvoice.findMany({ take: 1000 });
    else if (kind === "receiving") records = await db.goodsReceipt.findMany({ take: 1000 });
    else if (kind === "purchase-requests")
      records = await db.purchaseRequest.findMany({
        where: actor.role === "DEPARTMENT_MANAGER" ? { department: { managerId: actor.id } } : {},
        take: 1000,
      });
    else if (kind === "procurement")
      records = await db.purchaseOrder.findMany({
        where:
          actor.role === "DEPARTMENT_MANAGER"
            ? { costCenter: { department: { managerId: actor.id } } }
            : {},
        take: 1000,
      });
    else
      records = await db.budgetAccount.findMany({
        where:
          actor.role === "DEPARTMENT_MANAGER"
            ? { costCenter: { department: { managerId: actor.id } } }
            : {},
        take: 1000,
      });
    assert(records.length < 1000, "EXPORT_TOO_LARGE", "Reduce filter scope before export", 422);
    const fields = records.length
      ? Object.keys(records[0]).filter((k) => !k.toLowerCase().includes("password"))
      : [];
    const text = [
      fields.map(csvEscape).join(","),
      ...records.map((row) => fields.map((k) => csvEscape(row[k])).join(",")),
    ].join("\r\n");
    return new Response(text, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${kind}.csv"`,
      },
    });
  });
