import { createFileRoute } from "@tanstack/react-router";

import { NotificationsPage } from "../../../features/notifications/pages/NotificationsPage";
export const Route = createFileRoute("/_authenticated/app/notifications")({
  component: () => <NotificationsPage />,
});
