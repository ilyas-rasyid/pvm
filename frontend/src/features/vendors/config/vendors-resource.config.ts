import { columns } from "../../lists/config/resource-types";
import type { ResourceConfig, ResourceKind } from "../../lists/config/resource-types";

export const vendorsResourceConfigs = {
  vendors: {
    title: "Vendor directory",
    description: "Maintain approved suppliers and their contact details.",
    eyebrow: "MASTER DATA",
    endpoint: "/vendors",
    create: "/app/vendors/new",
    detail: "/app/vendors",
    columns: columns(
      { key: "code", label: "Vendor code" },
      { key: "name", label: "Legal name" },
      { key: "email", label: "Email" },
      { key: "active", label: "Active" },
    ),
  },
} satisfies Partial<Record<ResourceKind, ResourceConfig>>;
