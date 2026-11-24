import { z } from "zod";

export const role = z.enum([
  "EMPLOYEE",
  "DEPARTMENT_MANAGER",
  "PROCUREMENT_OFFICER",
  "RECEIVING_OFFICER",
  "FINANCE_OFFICER",
  "ADMIN",
]);
export const createUser = z
  .object({
    name: z.string().min(2),
    email: z.email(),
    role,
    departmentId: z.uuid().nullable().optional(),
    password: z.string().min(15).max(128),
  })
  .strict();
export const updateUser = z
  .object({
    name: z.string().min(2).optional(),
    role: role.optional(),
    departmentId: z.uuid().nullable().optional(),
  })
  .strict();
export const department = z
  .object({
    code: z.string().min(2).max(32),
    name: z.string().min(2),
    managerId: z.uuid().nullable().optional(),
  })
  .strict();
