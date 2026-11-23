import { z } from "zod";
export const poLine = z
  .object({
    requestLineId: z.uuid(),
    awardLineId: z.uuid().nullable().optional(),
    quantity: z.number().int().positive(),
    price: z.string().regex(/^\d{1,16}(\.\d{1,2})?$/),
    taxRate: z.string().default("0"),
  })
  .strict();
export const poCreate = z
  .object({
    requestId: z.uuid(),
    vendorId: z.uuid(),
    fiscalPeriodId: z.uuid(),
    deliveryLocationId: z.uuid().nullable().optional(),
    directExceptionId: z.uuid().nullable().optional(),
    sourcingMode: z.enum(["RFQ", "DIRECT"]),
    expectedAt: z.iso.datetime().optional(),
    lines: z.array(poLine).min(1),
  })
  .strict();
export const amend = z
  .object({
    reason: z.string().min(5),
    changes: z
      .array(
        z.object({
          lineId: z.uuid(),
          quantity: z.number().int().positive().optional(),
          price: z.string().optional(),
          taxRate: z.string().optional(),
        }),
      )
      .min(1),
  })
  .strict();
export const reason = z.object({ reason: z.string().min(5) }).strict();
