import { z } from "zod";
export const invoiceForm = z
  .object({
    orderId: z.uuid(),
    vendorId: z.uuid(),
    number: z.string().min(2).max(128),
    invoiceDate: z.iso.date(),
    lines: z
      .array(
        z.object({
          orderLineId: z.uuid(),
          quantity: z.number().int().positive(),
          price: z.string().regex(/^\d{1,16}(\.\d{1,2})?$/),
          taxRate: z.string().default("0"),
        }),
      )
      .min(1),
  })
  .strict();
export const reason = z.object({ reason: z.string().min(5) }).strict();
