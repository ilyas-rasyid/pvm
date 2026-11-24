import { z } from "zod";

export const adjustment = z
  .object({ amount: z.string().regex(/^-?\d{1,16}(\.\d{1,2})?$/), reason: z.string().min(5) })
  .strict();
