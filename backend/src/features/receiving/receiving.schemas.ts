import { z } from "zod";
export const receiptForm = z
  .object({
    orderId: z.uuid(),
    deliveryReference: z.string().min(2),
    note: z.string().optional(),
    lines: z
      .array(
        z.object({
          orderLineId: z.uuid(),
          deliveredQty: z.number().int().positive(),
          acceptedQty: z.number().int().nonnegative(),
          rejectedQty: z.number().int().nonnegative(),
          note: z.string().optional(),
        }),
      )
      .min(1),
  })
  .strict();
export const reasonForm = z.object({ reason: z.string().min(5) }).strict();
