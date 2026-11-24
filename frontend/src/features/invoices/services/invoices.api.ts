import { apiGet, apiPost } from "../../../shared/api/http-client";
import type { EntityRow, Order } from "../../../shared/types/models";

export const invoicesApi = {
  listOrders: () => apiGet<Order[]>("/purchase-orders?pageSize=100"),
  getOrder: (id: string) => apiGet<Order>(`/purchase-orders/${id}`),
  create: (payload: Record<string, unknown>) => apiPost<EntityRow>("/invoices", payload),
};
