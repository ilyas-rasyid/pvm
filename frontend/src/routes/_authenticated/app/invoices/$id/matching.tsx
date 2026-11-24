import { createFileRoute } from "@tanstack/react-router";

import { MatchingWorkspacePage } from "../../../../../features/matching/pages/MatchingWorkspacePage";
export const Route = createFileRoute("/_authenticated/app/invoices/$id/matching")({
  component: () => <MatchingWorkspacePage id={Route.useParams().id} />,
});
