import { createFileRoute } from "@tanstack/react-router";

import { DocumentDetailPage } from "../../../../features/documents/pages/DocumentDetailPage";
export const Route = createFileRoute("/_authenticated/app/rfqs/$id")({
  component: () => (
    <DocumentDetailPage
      kind="rfq"
      id={Route.useParams().id}
    />
  ),
});
