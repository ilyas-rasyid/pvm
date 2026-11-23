import { dec, available, money } from "./money";
import { assert } from "../errors/app-error";
import { lock, type Tx } from "../transactions/transaction";

export async function budgetChange(
  tx: Tx,
  accountId: string,
  eventKey: string,
  kind: string,
  sourceId: string,
  deltaAllocated: string,
  deltaCommitted: string,
  deltaVerified: string,
  actorId: string,
) {
  await lock(tx, "BudgetAccount", accountId);
  const old = await tx.budgetAccount.findUniqueOrThrow({ where: { id: accountId } });
  const nextA = dec(old.allocated.toString()).plus(deltaAllocated);
  const nextC = dec(old.committed.toString()).plus(deltaCommitted);
  const nextV = dec(old.verified.toString()).plus(deltaVerified);
  assert(
    nextA.gte(0) && nextC.gte(0) && nextV.gte(0) && available(nextA, nextC, nextV).gte(0),
    "BUDGET_INSUFFICIENT",
    "Insufficient available budget",
  );
  await tx.budgetAccount.update({
    where: { id: accountId },
    data: {
      allocated: money(nextA),
      committed: money(nextC),
      verified: money(nextV),
      version: { increment: 1 },
    },
  });
  await tx.budgetMovement.create({
    data: {
      budgetAccountId: accountId,
      eventKey,
      kind,
      sourceId,
      actorId,
      deltaAllocated,
      deltaCommitted,
      deltaVerified,
    },
  });
  return {
    allocated: money(nextA),
    committed: money(nextC),
    verified: money(nextV),
    available: money(available(nextA, nextC, nextV)),
  };
}

export async function findBudget(tx: Tx, costCenterId: string, fiscalPeriodId: string) {
  const account = await tx.budgetAccount.findUnique({
    where: { costCenterId_fiscalPeriodId: { costCenterId, fiscalPeriodId } },
  });
  assert(account, "BUDGET_NOT_FOUND", "Cost center budget is not configured", 422);
  return account;
}
