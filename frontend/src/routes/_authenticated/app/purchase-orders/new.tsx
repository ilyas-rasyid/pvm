import { createFileRoute } from "@tanstack/react-router";

import { PoFormPage } from "../../../../features/purchase-orders/pages/PoFormPage";
export const Route = createFileRoute("/_authenticated/app/purchase-orders/new")({
  component: () => <PoFormPage />,
});
