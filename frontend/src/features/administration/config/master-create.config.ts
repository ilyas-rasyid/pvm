export type Kind =
  | "vendor"
  | "user"
  | "department"
  | "cost-center"
  | "category"
  | "location"
  | "period"
  | "policy"
  | "budget";
export const redirectAfterCreate: Record<Kind, string> = {
  vendor: "/app/vendors",
  user: "/app/admin/users",
  department: "/app/admin/departments",
  "cost-center": "/app/admin/cost-centers",
  category: "/app/admin/categories",
  location: "/app/admin/locations",
  period: "/app/admin/periods",
  policy: "/app/admin/policies",
  budget: "/app/finance/budgets",
};
export const endpoints: Record<Kind, string> = {
  vendor: "/vendors",
  user: "/admin/users",
  department: "/admin/departments",
  "cost-center": "/admin/cost-centers",
  category: "/admin/item-categories",
  location: "/admin/delivery-locations",
  period: "/admin/fiscal-periods",
  policy: "/admin/procurement-policies",
  budget: "/budgets",
};
export const fields: Record<
  Kind,
  {
    name: string;
    label: string;
    type?: string;
    options?: string;
  }[]
> = {
  vendor: [
    { name: "code", label: "Vendor code" },
    { name: "name", label: "Legal company name" },
    { name: "email", label: "Business email", type: "email" },
    { name: "phone", label: "Phone" },
    { name: "address", label: "Address" },
  ],
  user: [
    { name: "name", label: "Full name" },
    { name: "email", label: "Work email", type: "email" },
    { name: "password", label: "Temporary password (15+ chars)", type: "password" },
    {
      name: "role",
      label: "Role",
      options:
        "EMPLOYEE,DEPARTMENT_MANAGER,PROCUREMENT_OFFICER,RECEIVING_OFFICER,FINANCE_OFFICER,ADMIN",
    },
    { name: "departmentId", label: "Department", options: "departments" },
  ],
  department: [
    { name: "code", label: "Department code" },
    { name: "name", label: "Department name" },
  ],
  "cost-center": [
    { name: "code", label: "Cost center code" },
    { name: "name", label: "Cost center name" },
    { name: "departmentId", label: "Department", options: "departments" },
  ],
  category: [
    { name: "code", label: "Category code" },
    { name: "name", label: "Category name" },
  ],
  location: [
    { name: "code", label: "Location code" },
    { name: "name", label: "Location name" },
    { name: "address", label: "Address" },
  ],
  period: [
    { name: "code", label: "Fiscal period code" },
    { name: "startDate", label: "Start", type: "date" },
    { name: "endDate", label: "End", type: "date" },
  ],
  policy: [
    { name: "directPurchaseThreshold", label: "Direct purchase maximum (IDR)" },
    { name: "directPurchaseEnabled", label: "Enable direct purchase", options: "true,false" },
  ],
  budget: [
    { name: "costCenterId", label: "Cost center", options: "centers" },
    { name: "fiscalPeriodId", label: "Fiscal period", options: "periods" },
    { name: "amount", label: "Initial allocation (IDR)" },
  ],
};
