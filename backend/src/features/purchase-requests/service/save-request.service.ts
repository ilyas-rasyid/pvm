import { db } from "../../../infrastructure/database/prisma-client";
import { assert } from "../../../shared/errors/app-error";
import { dec, money } from "../../../shared/finance/money";
import { command, event, nextRef } from "../../../shared/transactions/transaction";
import { requireVersion } from "../../../shared/http/version";
import type { Actor, RouteContext } from "../../../shared/http/context";
import { requestForm } from "../payload/request.schema";

export async function saveRequest(ctx: RouteContext, actor: Actor, id?: string) {
  const form = requestForm.parse(ctx.body);
  const { lines: requestedLines, ...header } = form;
  const center = await db.costCenter.findUnique({ where: { id: form.costCenterId } });
  assert(
    center && center.active && center.departmentId === form.departmentId,
    "COST_CENTER_INVALID",
    "Select a valid cost center",
    422,
  );
  if (actor.role !== "ADMIN") {
    assert(actor.departmentId === form.departmentId, "ACCESS_DENIED", "Wrong department", 403);
  }
  const estimatedTotal = money(
    form.lines.reduce((s, line) => s.plus(dec(line.estimatedPrice).mul(line.quantity)), dec(0)),
  );
  return command(ctx, actor, id ? `pr.edit.${id}` : "pr.create", async (tx) => {
    let record;
    if (id) {
      record = await tx.purchaseRequest.findUniqueOrThrow({ where: { id } });
      assert(
        record.requesterId === actor.id && record.status === "DRAFT",
        "ACCESS_DENIED",
        "Only your draft can be edited",
        403,
      );
      requireVersion(ctx, record.version);
      await tx.purchaseRequestLine.deleteMany({ where: { requestId: id } });
      record = await tx.purchaseRequest.update({
        where: { id },
        data: {
          ...header,
          neededBy: new Date(form.neededBy),
          estimatedTotal,
          version: { increment: 1 },
        },
      });
    } else {
      record = await tx.purchaseRequest.create({
        data: {
          reference: await nextRef(tx, "PR"),
          requesterId: actor.id,
          ...header,
          neededBy: new Date(form.neededBy),
          estimatedTotal,
        },
      });
    }
    await tx.purchaseRequestLine.createMany({
      data: requestedLines.map((line) => ({
        requestId: record.id,
        description: line.description,
        categoryId: line.categoryId || null,
        unit: line.unit,
        quantity: line.quantity,
        estimatedPrice: line.estimatedPrice,
        lineTotal: money(dec(line.estimatedPrice).mul(line.quantity)),
      })),
    });
    await event(tx, actor, id ? "PR_EDITED" : "PR_CREATED", "PurchaseRequest", record.id);
    return tx.purchaseRequest.findUniqueOrThrow({
      where: { id: record.id },
      include: { lines: true },
    });
  });
}
