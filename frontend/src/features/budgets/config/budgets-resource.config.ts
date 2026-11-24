import { columns } from "../../lists/config/resource-types";
import type { ResourceConfig, ResourceKind } from "../../lists/config/resource-types";

export const budgetsResourceConfigs = {
  budgets: {
    title: "Budget overview",
    description: "Allocated, committed, verified and available funds by cost center.",
    eyebrow: "FINANCIAL CONTROL",
    endpoint: "/budgets",
    create: "/app/admin/budgets/new",
    detail: "/app/budgets",
    columns: columns(
      { key: "costCenter.name", label: "Cost center" },
      { key: "allocated", label: "Allocated", type: "money" },
      { key: "committed", label: "Committed", type: "money" },
      { key: "verified", label: "Verified", type: "money" },
      { key: "available", label: "Available", type: "money" },
    ),
  },
} satisfies Partial<Record<ResourceKind, ResourceConfig>>;
