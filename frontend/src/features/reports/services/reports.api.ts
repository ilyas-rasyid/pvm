import { apiGet } from "../../../shared/api/http-client";

export const reportsApi = {
  getReport: (kind: string) => apiGet<Record<string, unknown>[]>(`/reports/${kind}`),
};
