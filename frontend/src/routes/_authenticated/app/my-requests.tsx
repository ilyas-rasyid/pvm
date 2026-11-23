import { createFileRoute } from "@tanstack/react-router";
import { ResourceListPage } from "../../../features/lists/pages/ResourceListPage";
export const Route = createFileRoute("/_authenticated/app/my-requests")({
  component: () => <ResourceListPage kind="my-requests" />,
});
