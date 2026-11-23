import { z } from "zod";
export const rfqSchema = z
  .object({
    requestId: z.uuid(),
    deadline: z.iso.datetime().optional(),
    lines: z
      .array(z.object({ requestLineId: z.uuid(), quantity: z.number().int().positive() }))
      .min(1),
    vendorIds: z.array(z.uuid()).min(1),
  })
  .strict();
export const quoteSchema = z
  .object({
    vendorId: z.uuid(),
    reference: z.string().min(2),
    validUntil: z.iso.datetime().optional(),
    leadDays: z.number().int().nonnegative().default(7),
    notes: z.string().optional(),
    lines: z
      .array(
        z.object({
          rfqLineId: z.uuid(),
          quantity: z.number().int().positive(),
          price: z.string().regex(/^\d{1,16}(\.\d{1,2})?$/),
          taxRate: z.string().default("0"),
        }),
      )
      .min(1),
  })
  .strict();
export const awardSchema = z
  .object({
    reason: z.string().min(5),
    lines: z
      .array(
        z.object({
          rfqLineId: z.uuid(),
          quotationLineId: z.uuid(),
          quantity: z.number().int().positive(),
        }),
      )
      .min(1),
  })
  .strict();
