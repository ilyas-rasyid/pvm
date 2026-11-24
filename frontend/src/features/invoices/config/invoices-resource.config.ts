import { columns } from "../../lists/config/resource-types";
import type { ResourceConfig, ResourceKind } from "../../lists/config/resource-types";

export const invoicesResourceConfigs = {
  invoices: {
    title: "Vendor invoices",
    description: "Review vendor bills and verification progress.",
    eyebrow: "FINANCE",
    endpoint: "/invoices",
    create: "/app/invoices/new",
    detail: "/app/invoices",
    columns: columns(
      { key: "number", label: "Invoice" },
      { key: "vendor.name", label: "Vendor" },
      { key: "order.reference", label: "PO" },
      { key: "total", label: "Total", type: "money" },
      { key: "status", label: "Status", type: "status" },
    ),
  },
  ready: {
    title: "Ready for payment",
    description: "Verified invoices. Payment execution occurs outside PVMS.",
    eyebrow: "FINANCE",
    endpoint: "/finance/ready-for-payment",
    detail: "/app/invoices",
    columns: columns(
      { key: "number", label: "Invoice" },
      { key: "vendor.name", label: "Vendor" },
      { key: "total", label: "Verified amount", type: "money" },
      { key: "readyAt", label: "Verified on", type: "date" },
    ),
  },
} satisfies Partial<Record<ResourceKind, ResourceConfig>>;
