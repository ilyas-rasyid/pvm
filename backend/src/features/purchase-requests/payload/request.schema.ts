import { z } from "zod";
export const requestLine = z
  .object({
    description: z.string().min(2).max(500),
    categoryId: z.uuid().nullable().optional(),
    unit: z.string().min(1).max(20).default("UNIT"),
    quantity: z.number().int().positive().max(1000000),
    estimatedPrice: z.string().regex(/^\d{1,16}(\.\d{1,2})?$/),
  })
  .strict();
export const requestForm = z
  .object({
    title: z.string().min(3).max(180),
    departmentId: z.uuid(),
    costCenterId: z.uuid(),
    neededBy: z.iso.date(),
    justification: z.string().min(10).max(3000),
    lines: z.array(requestLine).min(1).max(100),
  })
  .strict();
export const reasonForm = z.object({ reason: z.string().min(5).max(2000) }).strict();
