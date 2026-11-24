import { apiGet, apiPost } from "../../../shared/api/http-client";
import type { EntityRow, PurchaseRequest } from "../../../shared/types/models";
import type { Rfq } from "../types/po-form.types";

export const purchaseOrdersApi = {
  listQueue: () => apiGet<PurchaseRequest[]>("/procurement/queue"),
  listVendors: () => apiGet<EntityRow[]>("/vendors?pageSize=100"),
  listPeriods: () => apiGet<EntityRow[]>("/admin/fiscal-periods"),
  listLocations: () => apiGet<EntityRow[]>("/admin/delivery-locations"),
  listRfqs: () => apiGet<Rfq[]>("/rfqs?pageSize=100"),
  getRfq: (id: string) => apiGet<Rfq>(`/rfqs/${id}`),
  registerDirectPurchase: (payload: Record<string, unknown>) =>
    apiPost<EntityRow>("/direct-purchase-exceptions", payload),
  create: (payload: Record<string, unknown>) => apiPost<EntityRow>("/purchase-orders", payload),
};
