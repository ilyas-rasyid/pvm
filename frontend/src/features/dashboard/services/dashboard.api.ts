import { apiGet } from "../../../shared/api/http-client";

export const dashboardApi = {
  summary: () => apiGet<Record<string, number>>("/dashboard/summary"),
};
