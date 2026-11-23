import { Elysia } from "elysia";
import { z } from "zod";
import { db } from "../../infrastructure/database/prisma-client";
import { secureActor } from "../../security/session";
import { response } from "../../shared/http/context";
import { command, event } from "../../shared/transactions/transaction";
import { budgetChange } from "../../shared/finance/budget";
import { money, dec, available } from "../../shared/finance/money";
import { assert } from "../../shared/errors/app-error";

const readers = ["DEPARTMENT_MANAGER", "PROCUREMENT_OFFICER", "FINANCE_OFFICER", "ADMIN"];
const adjustment = z
  .object({ amount: z.string().regex(/^-?\d{1,16}(\.\d{1,2})?$/), reason: z.string().min(5) })
  .strict();
export const budgetsRoutes = new Elysia()
  .get("/budgets", async (ctx) => {
    const a = await secureActor(ctx, readers, false);
    const where =
      a.role === "DEPARTMENT_MANAGER" ? { costCenter: { department: { managerId: a.id } } } : {};
    const rows = await db.budgetAccount.findMany({
      where,
      include: { costCenter: true, fiscalPeriod: true },
      orderBy: { fiscalPeriod: { startDate: "desc" } },
    });
    return response(
      rows.map((x) => ({
        ...x,
        available: money(
          available(x.allocated.toString(), x.committed.toString(), x.verified.toString()),
        ),
      })),
    );
  })
  .get("/budgets/:id", async (ctx) => {
    const a = await secureActor(ctx, readers, false);
    const account = await db.budgetAccount.findUniqueOrThrow({
      where: { id: ctx.params.id },
      include: { costCenter: { include: { department: true } }, fiscalPeriod: true },
    });
    if (a.role === "DEPARTMENT_MANAGER")
      assert(
        account.costCenter.department.managerId === a.id,
        "ACCESS_DENIED",
        "Budget not in scope",
        403,
      );
    return response({
      ...account,
      available: money(
        available(
          account.allocated.toString(),
          account.committed.toString(),
          account.verified.toString(),
        ),
      ),
    });
  })
  .get("/budgets/:id/movements", async (ctx) => {
    const a = await secureActor(ctx, readers, false);
    const account = await db.budgetAccount.findUniqueOrThrow({
      where: { id: ctx.params.id },
      include: { costCenter: { include: { department: true } } },
    });
    if (a.role === "DEPARTMENT_MANAGER")
      assert(
        account.costCenter.department.managerId === a.id,
        "ACCESS_DENIED",
        "Budget out of scope",
        403,
      );
    return response(
      await db.budgetMovement.findMany({
        where: { budgetAccountId: ctx.params.id },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    );
  })
  .post("/budgets", async (ctx) => {
    const a = await secureActor(ctx, ["ADMIN"]);
    const form = z
      .object({ costCenterId: z.uuid(), fiscalPeriodId: z.uuid(), amount: z.string() })
      .strict()
      .parse(ctx.body);
    assert(dec(form.amount).gte(0), "AMOUNT_INVALID", "Budget must be nonnegative", 422);
    return response(
      await command(ctx, a, "budget.create", async (tx) => {
        const account = await tx.budgetAccount.create({
          data: {
            costCenterId: form.costCenterId,
            fiscalPeriodId: form.fiscalPeriodId,
            allocated: "0",
          },
        });
        await budgetChange(
          tx,
          account.id,
          `budget.init.${account.id}`,
          "INITIAL_ALLOCATION",
          account.id,
          form.amount,
          "0",
          "0",
          a.id,
        );
        await event(tx, a, "BUDGET_CREATED", "BudgetAccount", account.id);
        return account;
      }),
    );
  })
  .post("/budgets/:id/adjustments", async (ctx) => {
    const a = await secureActor(ctx, ["ADMIN"]);
    const form = adjustment.parse(ctx.body);
    return response(
      await command(ctx, a, `budget.adjust.${ctx.params.id}`, async (tx) => {
        const x = await tx.budgetAdjustment.create({
          data: {
            budgetAccountId: ctx.params.id,
            amount: form.amount,
            reason: form.reason,
            actorId: a.id,
          },
        });
        const balances = await budgetChange(
          tx,
          ctx.params.id,
          `budget.adjust.${x.id}`,
          "BUDGET_ADJUSTMENT",
          x.id,
          form.amount,
          "0",
          "0",
          a.id,
        );
        await event(tx, a, "BUDGET_ADJUSTED", "BudgetAccount", ctx.params.id);
        return { adjustment: x, balances };
      }),
    );
  });
