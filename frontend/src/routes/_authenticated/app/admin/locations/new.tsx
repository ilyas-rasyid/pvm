import { createFileRoute } from "@tanstack/react-router";
import { MasterCreatePage } from "../../../../../features/administration/pages/MasterCreatePage";
export const Route = createFileRoute("/_authenticated/app/admin/locations/new")({
  component: () => <MasterCreatePage kind="location" />,
});
