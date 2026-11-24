import { apiGet, apiPost } from "../../../shared/api/http-client";
import type { QuotationComparison } from "../types/quotation-comparison.types";

export const quotationComparisonApi = {
  getRfq: (id: string) => apiGet(`/rfqs/${id}`),
  getComparison: (id: string) => apiGet<QuotationComparison>(`/rfqs/${id}/comparison`),
  award: (id: string, reason: string, lines: Record<string, unknown>[]) =>
    apiPost(`/rfqs/${id}/award`, { reason, lines }, `/rfqs/${id}`),
};
