import { createFileRoute } from "@tanstack/react-router";

import { ResourceListPage } from "../../../../features/lists/pages/ResourceListPage";
export const Route = createFileRoute("/_authenticated/app/finance/matching-queue")({
  component: () => <ResourceListPage kind="matching-queue" />,
});
