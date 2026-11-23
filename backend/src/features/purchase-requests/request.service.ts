import { db } from "../../infrastructure/database/prisma-client";
import { assert } from "../../shared/errors/app-error";
import { dec, money } from "../../shared/finance/money";
import { command, event, nextRef } from "../../shared/transactions/transaction";
import { requireVersion } from "../../shared/http/version";
import type { Actor, RouteContext } from "../../shared/http/context";
import { requestForm } from "./request.schemas";

export function canReadRequest(
  actor: Actor,
  request: {
    requesterId: string;
    departmentId: string;
  },
) {
  return (
    request.requesterId === actor.id ||
    actor.role === "ADMIN" ||
    ["PROCUREMENT_OFFICER", "FINANCE_OFFICER"].includes(actor.role) ||
    (actor.role === "DEPARTMENT_MANAGER" && actor.departmentId === request.departmentId)
  );
}

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
  if (actor.role !== "ADMIN")
    assert(actor.departmentId === form.departmentId, "ACCESS_DENIED", "Wrong department", 403);
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

export async function transitionRequest(
  ctx: RouteContext,
  actor: Actor,
  id: string,
  action: string,
  reason?: string,
) {
  return command(ctx, actor, `pr.${action}.${id}`, async (tx) => {
    const record = await tx.purchaseRequest.findUniqueOrThrow({
      where: { id },
      include: { department: true },
    });
    requireVersion(ctx, record.version);
    const target: Record<
      string,
      {
        from: string[];
        to: string;
      }
    > = {
      submit: { from: ["DRAFT"], to: "SUBMITTED" },
      withdraw: { from: ["SUBMITTED"], to: "CANCELLED" },
      cancel: { from: ["DRAFT", "APPROVED"], to: "CANCELLED" },
      approve: { from: ["SUBMITTED"], to: "APPROVED" },
      reject: { from: ["SUBMITTED"], to: "REJECTED" },
    };
    const transition = target[action];
    assert(
      transition && transition.from.includes(record.status),
      "INVALID_STATE_TRANSITION",
      "Action is not allowed from current state",
    );
    if (["approve", "reject"].includes(action)) {
      assert(
        actor.role === "ADMIN" ||
          (actor.role === "DEPARTMENT_MANAGER" && record.department.managerId === actor.id),
        "ACCESS_DENIED",
        "Not the assigned manager",
        403,
      );
      assert(
        actor.id !== record.requesterId,
        "SELF_APPROVAL_FORBIDDEN",
        "Requester cannot approve own request",
        403,
      );
      if (action === "reject")
        assert(reason && reason.trim().length >= 5, "REASON_REQUIRED", "Reason is required", 422);
      await tx.purchaseRequestApproval.create({
        data: { requestId: id, actorId: actor.id, decision: action.toUpperCase(), reason },
      });
    } else {
      assert(
        actor.id === record.requesterId,
        "ACCESS_DENIED",
        "Only requester may change this request",
        403,
      );
    }
    if (action === "cancel" && record.status === "APPROVED") {
      const active = await tx.purchaseOrder.count({
        where: { requestId: id, status: { notIn: ["CANCELLED", "CLOSED"] } },
      });
      assert(
        active === 0,
        "PR_HAS_ACTIVE_ORDERS",
        "Cannot cancel request with active purchase orders",
      );
    }
    if (action === "approve")
      await tx.purchaseRequestLine.updateMany({
        where: { requestId: id },
        data: { approvedQty: 0 },
      });
    if (action === "approve") {
      const lines = await tx.purchaseRequestLine.findMany({ where: { requestId: id } });
      for (const line of lines)
        await tx.purchaseRequestLine.update({
          where: { id: line.id },
          data: { approvedQty: line.quantity },
        });
    }
    const updated = await tx.purchaseRequest.update({
      where: { id },
      data: {
        status: transition.to,
        version: { increment: 1 },
        ...(action === "submit" ? { submittedAt: new Date() } : {}),
        ...(action === "approve" ? { approvedAt: new Date() } : {}),
      },
    });
    await event(
      tx,
      actor,
      `PR_${action.toUpperCase()}`,
      "PurchaseRequest",
      id,
      ["approve", "reject"].includes(action)
        ? record.requesterId
        : record.department.managerId || undefined,
    );
    return updated;
  });
}
