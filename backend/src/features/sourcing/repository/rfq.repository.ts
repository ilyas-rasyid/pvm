import { db } from "../../../infrastructure/database/prisma-client";

export async function findRfqDetail(id: string) {
  return await db.rfq.findUniqueOrThrow({
    where: { id: id },
    include: {
      lines: { include: { requestLine: true } },
      invitations: true,
      quotations: { include: { vendor: true, revisions: { include: { lines: true } } } },
      award: { include: { lines: true } },
    },
  });
}
