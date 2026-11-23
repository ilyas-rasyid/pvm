import { createFileRoute } from "@tanstack/react-router";
import { QuotationComparePage } from "../../../../../features/sourcing/pages/QuotationComparePage";
export const Route = createFileRoute("/_authenticated/app/rfqs/$id/compare")({
  component: () => <QuotationComparePage id={Route.useParams().id} />,
});
