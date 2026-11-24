import { db } from "../../../infrastructure/database/prisma-client";

export async function findReceiptDetail(id: string) {
  return await db.goodsReceipt.findUniqueOrThrow({
    where: { id: id },
    include: {
      lines: { include: { orderLine: true } },
      order: { select: { reference: true, vendorId: true } },
    },
  });
}
