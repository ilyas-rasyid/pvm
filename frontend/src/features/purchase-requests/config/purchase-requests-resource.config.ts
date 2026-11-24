import { columns } from "../../lists/config/resource-types";
import type { ResourceConfig, ResourceKind } from "../../lists/config/resource-types";

export const purchaseRequestsResourceConfigs = {
  "my-requests": {
    title: "My purchase requests",
    description: "Track the requests you created and their approval progress.",
    eyebrow: "PURCHASING",
    endpoint: "/my/purchase-requests",
    create: "/app/requests/new",
    detail: "/app/requests",
    columns: columns(
      { key: "reference", label: "Reference" },
      { key: "title", label: "Request" },
      { key: "estimatedTotal", label: "Estimated total", type: "money" },
      { key: "status", label: "Status", type: "status" },
      { key: "createdAt", label: "Created", type: "date" },
    ),
  },
  requests: {
    title: "Purchase requests",
    description: "Department and procurement request records.",
    eyebrow: "PURCHASING",
    endpoint: "/purchase-requests",
    create: "/app/requests/new",
    detail: "/app/requests",
    columns: columns(
      { key: "reference", label: "Reference" },
      { key: "title", label: "Request" },
      { key: "estimatedTotal", label: "Estimated", type: "money" },
      { key: "status", label: "Status", type: "status" },
    ),
  },
} satisfies Partial<Record<ResourceKind, ResourceConfig>>;
