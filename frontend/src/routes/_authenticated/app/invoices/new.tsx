import { createFileRoute } from "@tanstack/react-router";
import { InvoiceFormPage } from "../../../../features/forms/pages/InvoiceFormPage";
export const Route = createFileRoute("/_authenticated/app/invoices/new")({
  component: () => <InvoiceFormPage />,
});
