import { db } from "../../../infrastructure/database/prisma-client";

export async function findPurchaseOrderDetail(id: string) {
  return await db.purchaseOrder.findUniqueOrThrow({
    where: { id: id },
    include: {
      vendor: true,
      request: true,
      lines: { include: { requestLine: true } },
      versions: { include: { lines: true } },
      receipts: { select: { id: true, reference: true, status: true } },
      invoices: { select: { id: true, number: true, status: true, total: true } },
    },
  });
}
