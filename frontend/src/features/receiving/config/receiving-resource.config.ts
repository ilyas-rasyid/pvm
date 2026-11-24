import { columns } from "../../lists/config/resource-types";
import type { ResourceConfig, ResourceKind } from "../../lists/config/resource-types";

export const receivingResourceConfigs = {
  expected: {
    title: "Expected deliveries",
    description: "Orders available for goods receiving.",
    eyebrow: "RECEIVING",
    endpoint: "/receiving/expected",
    create: "/app/receipts/new",
    detail: "/app/purchase-orders",
    columns: columns(
      { key: "reference", label: "PO" },
      { key: "vendor.name", label: "Vendor" },
      { key: "status", label: "Status", type: "status" },
      { key: "expectedAt", label: "Expected", type: "date" },
    ),
  },
  receipts: {
    title: "Goods receipts",
    description: "Evidence of deliveries accepted and rejected.",
    eyebrow: "RECEIVING",
    endpoint: "/goods-receipts",
    create: "/app/receipts/new",
    detail: "/app/receipts",
    columns: columns(
      { key: "reference", label: "Receipt" },
      { key: "order.reference", label: "PO" },
      { key: "status", label: "Status", type: "status" },
      { key: "receivedAt", label: "Received", type: "date" },
    ),
  },
  "receiving-history": {
    title: "Receiving history",
    description: "Posted receipt history.",
    eyebrow: "RECEIVING",
    endpoint: "/receiving/history",
    detail: "/app/receipts",
    columns: columns(
      { key: "reference", label: "Receipt" },
      { key: "status", label: "Status", type: "status" },
      { key: "postedAt", label: "Posted", type: "date" },
    ),
  },
} satisfies Partial<Record<ResourceKind, ResourceConfig>>;
