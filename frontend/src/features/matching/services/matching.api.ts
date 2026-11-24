import { apiGet, apiPost } from "../../../shared/api/http-client";
import type { Invoice } from "../../../shared/types/models";

export const matchingApi = {
  getInvoice: (id: string) => apiGet<Invoice>(`/invoices/${id}`),
  execute: (id: string, command: string) =>
    apiPost(`/invoices/${id}/${command}`, {}, `/invoices/${id}`),
};
