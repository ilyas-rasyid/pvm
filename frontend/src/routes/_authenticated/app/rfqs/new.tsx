import { createFileRoute } from "@tanstack/react-router";
import { RfqFormPage } from "../../../../features/forms/pages/RfqFormPage";
export const Route = createFileRoute("/_authenticated/app/rfqs/new")({
  component: () => <RfqFormPage />,
});
