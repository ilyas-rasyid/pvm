import { createFileRoute } from "@tanstack/react-router";

import { MasterCreatePage } from "../../../../features/administration/pages/MasterCreatePage";
export const Route = createFileRoute("/_authenticated/app/vendors/new")({
  component: () => <MasterCreatePage kind="vendor" />,
});
