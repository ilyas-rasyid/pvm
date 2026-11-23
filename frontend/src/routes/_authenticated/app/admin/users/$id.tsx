import { createFileRoute } from "@tanstack/react-router";
import { DocumentDetailPage } from "../../../../../features/documents/pages/DocumentDetailPage";
export const Route = createFileRoute("/_authenticated/app/admin/users/$id")({
  component: () => (
    <DocumentDetailPage
      kind="user"
      id={Route.useParams().id}
    />
  ),
});
