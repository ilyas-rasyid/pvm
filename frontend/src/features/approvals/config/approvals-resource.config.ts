import { columns } from "../../lists/config/resource-types";
import type { ResourceConfig, ResourceKind } from "../../lists/config/resource-types";

export const approvalsResourceConfigs = {
  approvals: {
    title: "Approval queue",
    description: "Review submitted requests from your assigned department.",
    eyebrow: "MANAGEMENT",
    endpoint: "/approvals/queue",
    detail: "/app/requests",
    columns: columns(
      { key: "reference", label: "Reference" },
      { key: "title", label: "Request" },
      { key: "estimatedTotal", label: "Estimated total", type: "money" },
      { key: "submittedAt", label: "Submitted", type: "date" },
    ),
  },
} satisfies Partial<Record<ResourceKind, ResourceConfig>>;
