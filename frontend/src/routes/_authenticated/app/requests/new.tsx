import { createFileRoute } from "@tanstack/react-router";

import { RequestFormPage } from "../../../../features/purchase-requests/pages/RequestFormPage";
export const Route = createFileRoute("/_authenticated/app/requests/new")({
  component: () => <RequestFormPage />,
});
