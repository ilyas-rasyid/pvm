import { assert } from "../../../shared/errors/app-error";
import { command, event } from "../../../shared/transactions/transaction";
import { requireVersion } from "../../../shared/http/version";
import type { Actor, RouteContext } from "../../../shared/http/context";

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
      if (action === "reject") {
        assert(reason && reason.trim().length >= 5, "REASON_REQUIRED", "Reason is required", 422);
      }
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
    if (action === "approve") {
      await tx.purchaseRequestLine.updateMany({
        where: { requestId: id },
        data: { approvedQty: 0 },
      });
    }
    if (action === "approve") {
      const lines = await tx.purchaseRequestLine.findMany({ where: { requestId: id } });
      for (const line of lines) {
        await tx.purchaseRequestLine.update({
          where: { id: line.id },
          data: { approvedQty: line.quantity },
        });
      }
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
