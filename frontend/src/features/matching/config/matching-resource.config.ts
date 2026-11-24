import { columns } from "../../lists/config/resource-types";
import type { ResourceConfig, ResourceKind } from "../../lists/config/resource-types";

export const matchingResourceConfigs = {
  "matching-queue": {
    title: "Matching queue",
    description: "Invoices requiring matching or final verification.",
    eyebrow: "FINANCE",
    endpoint: "/finance/matching-queue",
    detail: "/app/invoices",
    columns: columns(
      { key: "number", label: "Invoice" },
      { key: "vendor.name", label: "Vendor" },
      { key: "total", label: "Value", type: "money" },
      { key: "status", label: "Status", type: "status" },
    ),
  },
  discrepancies: {
    title: "Invoice discrepancies",
    description: "Find differences before final verification.",
    eyebrow: "FINANCE",
    endpoint: "/finance/discrepancies",
    detail: "/app/invoices",
    columns: columns(
      { key: "number", label: "Invoice" },
      { key: "vendor.name", label: "Vendor" },
      { key: "total", label: "Value", type: "money" },
      { key: "status", label: "Status", type: "status" },
    ),
  },
} satisfies Partial<Record<ResourceKind, ResourceConfig>>;
