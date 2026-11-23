import { createFileRoute } from "@tanstack/react-router";
import { ReceiptFormPage } from "../../../../features/forms/pages/ReceiptFormPage";
export const Route = createFileRoute("/_authenticated/app/receipts/new")({
  component: () => <ReceiptFormPage />,
});
