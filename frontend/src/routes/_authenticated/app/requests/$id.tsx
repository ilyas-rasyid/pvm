import { createFileRoute } from "@tanstack/react-router";

import { DocumentDetailPage } from "../../../../features/documents/pages/DocumentDetailPage";
export const Route = createFileRoute("/_authenticated/app/requests/$id")({
  component: () => (
    <DocumentDetailPage
      kind="request"
      id={Route.useParams().id}
    />
  ),
});
