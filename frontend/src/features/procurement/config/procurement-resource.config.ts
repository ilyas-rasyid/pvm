import { columns } from "../../lists/config/resource-types";
import type { ResourceConfig, ResourceKind } from "../../lists/config/resource-types";

export const procurementResourceConfigs = {
  "procurement-queue": {
    title: "Procurement queue",
    description: "Approved requests awaiting sourcing and purchase order creation.",
    eyebrow: "SOURCING",
    endpoint: "/procurement/queue",
    detail: "/app/requests",
    columns: columns(
      { key: "reference", label: "Reference" },
      { key: "title", label: "Request" },
      { key: "estimatedTotal", label: "Estimated", type: "money" },
      { key: "approvedAt", label: "Approved", type: "date" },
    ),
  },
} satisfies Partial<Record<ResourceKind, ResourceConfig>>;
