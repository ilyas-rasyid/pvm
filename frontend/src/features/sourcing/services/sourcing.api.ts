import { apiGet, apiPost } from "../../../shared/api/http-client";
import type { EntityRow, PurchaseRequest } from "../../../shared/types/models";

export const sourcingApi = {
  listApprovedRequests: () => apiGet<PurchaseRequest[]>("/procurement/queue"),
  listVendors: () => apiGet<EntityRow[]>("/vendors?pageSize=100"),
  createRfq: (payload: Record<string, unknown>) => apiPost<EntityRow>("/rfqs", payload),
};
