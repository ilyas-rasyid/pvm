import { apiGet, apiPost } from "../../../shared/api/http-client";
import type { EntityRow } from "../../../shared/types/models";

export const purchaseRequestsApi = {
  listCostCenters: () => apiGet<EntityRow[]>("/admin/cost-centers"),
  listDepartments: () => apiGet<EntityRow[]>("/reference/departments"),
  create: (payload: Record<string, unknown>) => apiPost<EntityRow>("/purchase-requests", payload),
};
