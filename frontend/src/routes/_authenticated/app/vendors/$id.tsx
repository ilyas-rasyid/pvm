import { createFileRoute } from "@tanstack/react-router";

import { DocumentDetailPage } from "../../../../features/documents/pages/DocumentDetailPage";
export const Route = createFileRoute("/_authenticated/app/vendors/$id")({
  component: () => (
    <DocumentDetailPage
      kind="vendor"
      id={Route.useParams().id}
    />
  ),
});
