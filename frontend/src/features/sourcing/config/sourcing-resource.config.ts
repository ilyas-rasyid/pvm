import { columns } from "../../lists/config/resource-types";
import type { ResourceConfig, ResourceKind } from "../../lists/config/resource-types";

export const sourcingResourceConfigs = {
  rfqs: {
    title: "RFQs & quotations",
    description: "Collect offers, compare vendors, and record awards.",
    eyebrow: "SOURCING",
    endpoint: "/rfqs",
    create: "/app/rfqs/new",
    detail: "/app/rfqs",
    columns: columns(
      { key: "reference", label: "RFQ" },
      { key: "request.reference", label: "Source PR" },
      { key: "status", label: "Status", type: "status" },
      { key: "deadline", label: "Deadline", type: "date" },
    ),
  },
} satisfies Partial<Record<ResourceKind, ResourceConfig>>;
