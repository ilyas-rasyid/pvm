import { z } from "zod";

export const vendorSchema = z
  .object({
    code: z.string().min(2),
    name: z.string().min(2),
    email: z.email().nullable().optional(),
    phone: z.string().nullable().optional(),
    address: z.string().nullable().optional(),
    taxIdentifier: z.string().nullable().optional(),
  })
  .strict();
export const contactSchema = z
  .object({
    name: z.string().min(2),
    email: z.email().nullable().optional(),
    phone: z.string().nullable().optional(),
    title: z.string().nullable().optional(),
    primary: z.boolean().default(false),
  })
  .strict();
export const simple = z.object({ code: z.string().min(2), name: z.string().min(2) }).strict();
export const cost = z
  .object({ code: z.string().min(2), name: z.string().min(2), departmentId: z.uuid() })
  .strict();
export const period = z
  .object({ code: z.string().min(2), startDate: z.iso.date(), endDate: z.iso.date() })
  .strict();
