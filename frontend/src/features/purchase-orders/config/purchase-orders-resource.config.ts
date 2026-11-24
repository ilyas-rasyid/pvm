import { columns } from "../../lists/config/resource-types";
import type { ResourceConfig, ResourceKind } from "../../lists/config/resource-types";

export const purchaseOrdersResourceConfigs = {
  "purchase-orders": {
    title: "Purchase orders",
    description: "Track committed purchases, deliveries, and invoices.",
    eyebrow: "ORDERS",
    endpoint: "/purchase-orders",
    create: "/app/purchase-orders/new",
    detail: "/app/purchase-orders",
    columns: columns(
      { key: "reference", label: "PO" },
      { key: "vendor.name", label: "Vendor" },
      { key: "total", label: "Value", type: "money" },
      { key: "status", label: "Status", type: "status" },
      { key: "expectedAt", label: "Expected", type: "date" },
    ),
  },
} satisfies Partial<Record<ResourceKind, ResourceConfig>>;
