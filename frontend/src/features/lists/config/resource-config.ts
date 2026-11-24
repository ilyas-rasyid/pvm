import { invoicesResourceConfigs } from "../../invoices/config/invoices-resource.config";
import { matchingResourceConfigs } from "../../matching/config/matching-resource.config";
import { budgetsResourceConfigs } from "../../budgets/config/budgets-resource.config";
import { vendorsResourceConfigs } from "../../vendors/config/vendors-resource.config";
import { administrationResourceConfigs } from "../../administration/config/administration-resource.config";
import { notificationsResourceConfigs } from "../../notifications/config/notifications-resource.config";
import { purchaseRequestsResourceConfigs } from "../../purchase-requests/config/purchase-requests-resource.config";
import { approvalsResourceConfigs } from "../../approvals/config/approvals-resource.config";
import { procurementResourceConfigs } from "../../procurement/config/procurement-resource.config";
import { sourcingResourceConfigs } from "../../sourcing/config/sourcing-resource.config";
import { purchaseOrdersResourceConfigs } from "../../purchase-orders/config/purchase-orders-resource.config";
import { receivingResourceConfigs } from "../../receiving/config/receiving-resource.config";
import type { ResourceKind, ResourceConfig } from "./resource-types";

export type { ResourceKind, ResourceConfig } from "./resource-types";

export const configs: Record<ResourceKind, ResourceConfig> = {
  ...invoicesResourceConfigs,
  ...matchingResourceConfigs,
  ...budgetsResourceConfigs,
  ...vendorsResourceConfigs,
  ...administrationResourceConfigs,
  ...notificationsResourceConfigs,
  ...purchaseRequestsResourceConfigs,
  ...approvalsResourceConfigs,
  ...procurementResourceConfigs,
  ...sourcingResourceConfigs,
  ...purchaseOrdersResourceConfigs,
  ...receivingResourceConfigs,
};
