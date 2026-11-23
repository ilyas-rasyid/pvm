import { createFileRoute } from "@tanstack/react-router";
import { DocumentDetailPage } from "../../../../features/documents/pages/DocumentDetailPage";
export const Route = createFileRoute("/_authenticated/app/receipts/$id")({
  component: () => (
    <DocumentDetailPage
      kind="receipt"
      id={Route.useParams().id}
    />
  ),
});
