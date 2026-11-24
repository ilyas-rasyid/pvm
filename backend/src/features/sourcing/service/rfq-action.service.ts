import { assert } from "../../../shared/errors/app-error";
import { command, event } from "../../../shared/transactions/transaction";
import { requireVersion } from "../../../shared/http/version";
import type { Actor, RouteContext } from "../../../shared/http/context";

export async function rfqAction(ctx: RouteContext, actor: Actor, id: string, action: string) {
  return command(ctx, actor, `rfq.${action}.${id}`, async (tx) => {
    const rfq = await tx.rfq.findUniqueOrThrow({ where: { id } });
    requireVersion(ctx, rfq.version);
    const transitions: Record<string, [string, string]> = {
      open: ["DRAFT", "OPEN"],
      evaluate: ["OPEN", "EVALUATION"],
      cancel: [rfq.status, "CANCELLED"],
    };
    const tr = transitions[action];
    assert(
      tr && rfq.status === tr[0] && rfq.status !== "AWARDED",
      "INVALID_STATE_TRANSITION",
      "Invalid RFQ transition",
    );
    const updated = await tx.rfq.update({
      where: { id },
      data: { status: tr[1], version: { increment: 1 } },
    });
    await event(tx, actor, `RFQ_${action.toUpperCase()}`, "Rfq", id);
    return updated;
  });
}
