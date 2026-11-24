import { db } from "../../../infrastructure/database/prisma-client";

export async function findInvoiceDetail(id: string) {
  return await db.vendorInvoice.findUniqueOrThrow({
    where: { id: id },
    include: {
      vendor: true,
      order: {
        include: {
          lines: true,
          receipts: { where: { status: "POSTED" }, include: { lines: true } },
        },
      },
      lines: {
        include: { allocations: { include: { receiptLine: { include: { receipt: true } } } } },
      },
      matches: { include: { discrepancies: true }, orderBy: { createdAt: "desc" } },
    },
  });
}
