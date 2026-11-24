import { apiGet, apiPost } from "../../../shared/api/http-client";
import type { EntityRow } from "../../../shared/types/models";

export const masterDataApi = {
  departments: () => apiGet<EntityRow[]>("/reference/departments"),
  costCenters: () => apiGet<EntityRow[]>("/admin/cost-centers"),
  fiscalPeriods: () => apiGet<EntityRow[]>("/admin/fiscal-periods"),
  create: (endpoint: string, payload: Record<string, unknown>) => apiPost(endpoint, payload),
};
