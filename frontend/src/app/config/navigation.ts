import {
  LayoutDashboard,
  FileText,
  ClipboardCheck,
  ShoppingCart,
  Users,
  Warehouse,
  ReceiptText,
  Building2,
  Landmark,
  Settings2,
  BarChart3,
  Truck,
  FileCheck2,
  Scale,
  ShieldCheck,
} from "lucide-react";

export const nav = [
  {
    group: "Workspace",
    items: [
      { label: "Overview", to: "/app", icon: LayoutDashboard, roles: ["ALL"] },
      { label: "My requests", to: "/app/my-requests", icon: FileText, roles: ["ALL"] },
      {
        label: "Approvals",
        to: "/app/approvals",
        icon: ClipboardCheck,
        roles: ["DEPARTMENT_MANAGER", "ADMIN"],
      },
    ],
  },
  {
    group: "Procurement",
    items: [
      {
        label: "Procurement queue",
        to: "/app/procurement/queue",
        icon: FileCheck2,
        roles: ["PROCUREMENT_OFFICER", "ADMIN"],
      },
      {
        label: "RFQs & quotations",
        to: "/app/rfqs",
        icon: Scale,
        roles: ["PROCUREMENT_OFFICER", "ADMIN"],
      },
      {
        label: "Purchase orders",
        to: "/app/purchase-orders",
        icon: ShoppingCart,
        roles: ["PROCUREMENT_OFFICER", "RECEIVING_OFFICER", "FINANCE_OFFICER", "ADMIN"],
      },
      {
        label: "Vendors",
        to: "/app/vendors",
        icon: Building2,
        roles: ["PROCUREMENT_OFFICER", "FINANCE_OFFICER", "ADMIN"],
      },
    ],
  },
  {
    group: "Operations",
    items: [
      {
        label: "Expected deliveries",
        to: "/app/receiving/expected",
        icon: Truck,
        roles: ["RECEIVING_OFFICER", "ADMIN"],
      },
      {
        label: "Goods receipts",
        to: "/app/receipts",
        icon: Warehouse,
        roles: ["RECEIVING_OFFICER", "FINANCE_OFFICER", "PROCUREMENT_OFFICER", "ADMIN"],
      },
      {
        label: "Vendor invoices",
        to: "/app/invoices",
        icon: ReceiptText,
        roles: ["FINANCE_OFFICER", "ADMIN"],
      },
      {
        label: "Matching queue",
        to: "/app/finance/matching-queue",
        icon: FileCheck2,
        roles: ["FINANCE_OFFICER", "ADMIN"],
      },
      {
        label: "Discrepancies",
        to: "/app/finance/discrepancies",
        icon: ShieldCheck,
        roles: ["FINANCE_OFFICER", "ADMIN"],
      },
      {
        label: "Budgets",
        to: "/app/finance/budgets",
        icon: Landmark,
        roles: ["FINANCE_OFFICER", "ADMIN", "DEPARTMENT_MANAGER", "PROCUREMENT_OFFICER"],
      },
      {
        label: "Reports",
        to: "/app/reports",
        icon: BarChart3,
        roles: ["FINANCE_OFFICER", "ADMIN", "PROCUREMENT_OFFICER", "DEPARTMENT_MANAGER"],
      },
    ],
  },
  {
    group: "Administration",
    items: [
      { label: "People", to: "/app/admin/users", icon: Users, roles: ["ADMIN"] },
      { label: "Master data", to: "/app/admin/departments", icon: Settings2, roles: ["ADMIN"] },
      { label: "Audit log", to: "/app/admin/audit", icon: ShieldCheck, roles: ["ADMIN"] },
    ],
  },
] as const;
