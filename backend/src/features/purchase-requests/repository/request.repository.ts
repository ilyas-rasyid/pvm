import { db } from "../../../infrastructure/database/prisma-client";

export async function findRequestDetail(id: string) {
  return await db.purchaseRequest.findUniqueOrThrow({
    where: { id: id },
    include: {
      lines: true,
      requester: { select: { name: true } },
      approvals: true,
      rfqs: true,
      orders: { select: { id: true, reference: true, status: true } },
    },
  });
}
