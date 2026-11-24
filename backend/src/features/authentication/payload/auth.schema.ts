import { z } from "zod";

export const loginSchema = z.object({ email: z.email(), password: z.string().min(1) }).strict();
export const changeSchema = z
  .object({ oldPassword: z.string(), newPassword: z.string().min(15).max(128) })
  .strict();
