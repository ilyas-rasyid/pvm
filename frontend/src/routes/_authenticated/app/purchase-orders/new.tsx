import { createFileRoute } from "@tanstack/react-router";
import { PoFormPage } from "../../../../features/forms/pages/PoFormPage";
export const Route = createFileRoute("/_authenticated/app/purchase-orders/new")({
  component: () => <PoFormPage />,
});
