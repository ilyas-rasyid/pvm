import { createFileRoute } from "@tanstack/react-router";

import { DocumentDetailPage } from "../../../../features/documents/pages/DocumentDetailPage";
export const Route = createFileRoute("/_authenticated/app/invoices/$id")({
  component: () => (
    <DocumentDetailPage
      kind="invoice"
      id={Route.useParams().id}
    />
  ),
});
