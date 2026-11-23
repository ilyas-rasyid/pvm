import { createFileRoute } from "@tanstack/react-router";
import { ResourceListPage } from "../../../../features/lists/pages/ResourceListPage";
export const Route = createFileRoute("/_authenticated/app/finance/ready-for-payment")({
  component: () => <ResourceListPage kind="ready" />,
});
