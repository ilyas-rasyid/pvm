import { columns } from "../../lists/config/resource-types";
import type { ResourceConfig, ResourceKind } from "../../lists/config/resource-types";

export const notificationsResourceConfigs = {
  notifications: {
    title: "Notifications",
    description: "Recent operational events requiring attention.",
    eyebrow: "WORKSPACE",
    endpoint: "/notifications/",
    columns: columns(
      { key: "title", label: "Event" },
      { key: "message", label: "Details" },
      { key: "createdAt", label: "Time", type: "date" },
    ),
  },
} satisfies Partial<Record<ResourceKind, ResourceConfig>>;
