import { createFileRoute } from "@tanstack/react-router";

import { InvoiceFormPage } from "../../../../features/invoices/pages/InvoiceFormPage";
export const Route = createFileRoute("/_authenticated/app/invoices/new")({
  component: () => <InvoiceFormPage />,
});
