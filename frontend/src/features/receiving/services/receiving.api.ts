import { apiGet, apiPost } from "../../../shared/api/http-client";
import type { EntityRow, Order } from "../../../shared/types/models";

export const receivingApi = {
  expectedOrders: () => apiGet<Order[]>("/receiving/expected"),
  getOrder: (id: string) => apiGet<Order>(`/purchase-orders/${id}`),
  createReceipt: (payload: Record<string, unknown>) =>
    apiPost<EntityRow>("/goods-receipts", payload),
};
