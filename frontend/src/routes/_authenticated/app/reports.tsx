import { createFileRoute } from "@tanstack/react-router";
import { ReportsPage } from "../../../features/reports/pages/ReportsPage";
export const Route = createFileRoute("/_authenticated/app/reports")({
  component: () => <ReportsPage />,
});
