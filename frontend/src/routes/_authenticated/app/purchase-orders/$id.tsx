import { createFileRoute } from "@tanstack/react-router";

import { DocumentDetailPage } from "../../../../features/documents/pages/DocumentDetailPage";
export const Route = createFileRoute("/_authenticated/app/purchase-orders/$id")({
  component: () => (
    <DocumentDetailPage
      kind="po"
      id={Route.useParams().id}
    />
  ),
});
