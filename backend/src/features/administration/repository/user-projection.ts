export const profile = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  departmentId: true,
  department: {
    select: {
      id: true,
      name: true,
      code: true,
    },
  },
  createdAt: true,
} as const;
