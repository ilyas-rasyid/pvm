import { createHash } from "node:crypto";

import { Prisma } from "../../generated/prisma/client";
import { db } from "../../infrastructure/database/prisma-client";
import { AppError } from "../errors/app-error";
import type { Actor, RouteContext } from "../http/context";

export type Tx = Prisma.TransactionClient;
const isRetryable = (error: unknown) => {
  const code = (
    error as {
      code?: string;
    } | null
  )?.code;
  return code === "P2034" || code === "40P01";
};

export async function serializable<T>(action: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(action, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10000,
        timeout: 20000,
      });
    } catch (error) {
      if (!isRetryable(error) || attempt === 2) {
        throw error;
      }
    }
  }
  throw new AppError("TRANSACTION_CONFLICT", "Please retry this operation");
}

export async function lock(
  tx: Tx,
  table: "PurchaseRequestLine" | "PurchaseOrderLine" | "BudgetAccount" | "GoodsReceiptLine",
  id: string,
) {
  // Table names are hardcoded from a finite allowlist, never taken from user input.
  switch (table) {
    case "PurchaseRequestLine":
      await tx.$queryRaw`SELECT id FROM "PurchaseRequestLine" WHERE id = ${id} FOR UPDATE`;
      break;
    case "PurchaseOrderLine":
      await tx.$queryRaw`SELECT id FROM "PurchaseOrderLine" WHERE id = ${id} FOR UPDATE`;
      break;
    case "BudgetAccount":
      await tx.$queryRaw`SELECT id FROM "BudgetAccount" WHERE id = ${id} FOR UPDATE`;
      break;
    case "GoodsReceiptLine":
      await tx.$queryRaw`SELECT id FROM "GoodsReceiptLine" WHERE id = ${id} FOR UPDATE`;
      break;
  }
}

export async function nextRef(tx: Tx, prefix: string) {
  const year = new Date().getUTCFullYear();
  const sequence = await tx.documentSequence.upsert({
    where: { prefix_year: { prefix, year } },
    create: { prefix, year, nextValue: 2 },
    update: { nextValue: { increment: 1 } },
  });
  return `${prefix}-${year}-${String(sequence.nextValue - 1).padStart(6, "0")}`;
}

export async function event(
  tx: Tx,
  actor: Actor,
  action: string,
  type: string,
  id: string,
  recipientId?: string,
) {
  await tx.auditLog.create({
    data: { actorId: actor.id, action, resourceType: type, resourceId: id },
  });
  if (recipientId) {
    await tx.outboxEvent.create({
      data: { kind: "NOTIFY", payload: { recipientId, action, type, id } },
    });
  }
}

export async function command<T>(
  ctx: RouteContext,
  actor: Actor,
  scope: string,
  operation: (tx: Tx) => Promise<T>,
): Promise<T> {
  const key = ctx.request.headers.get("idempotency-key");
  if (!key || key.length > 128) {
    throw new AppError("IDEMPOTENCY_KEY_REQUIRED", "Valid Idempotency-Key required", 428);
  }
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(ctx.body ?? null))
    .digest("hex");
  const run = () =>
    serializable(async (tx) => {
      const old = await tx.idempotencyRecord.findUnique({
        where: { actorId_scope_key: { actorId: actor.id, scope, key } },
      });
      if (old) {
        if (old.payloadHash !== fingerprint) {
          throw new AppError(
            "IDEMPOTENCY_KEY_CONFLICT",
            "Key already used for a different request",
          );
        }
        return old.result as T;
      }
      const result = await operation(tx);
      await tx.idempotencyRecord.create({
        data: {
          actorId: actor.id,
          scope,
          key,
          payloadHash: fingerprint,
          result: JSON.parse(JSON.stringify(result)),
        },
      });
      return result;
    });
  try {
    return await run();
  } catch (error) {
    // A competing transaction may have committed the same key while ours waited.
    const err = error as {
      code?: string;
      meta?: {
        target?: string[] | string;
      };
    };
    const isIdempotencyP2002 =
      err?.code === "P2002" &&
      (Array.isArray(err?.meta?.target)
        ? err.meta.target.includes("key")
        : String(err?.meta?.target || "").includes("key"));
    if (!isIdempotencyP2002) {
      throw error;
    }
    const found = await db.idempotencyRecord.findUnique({
      where: { actorId_scope_key: { actorId: actor.id, scope, key } },
    });
    if (!found || found.payloadHash !== fingerprint) {
      throw new AppError("IDEMPOTENCY_KEY_CONFLICT", "Idempotency collision");
    }
    return found.result as T;
  }
}
