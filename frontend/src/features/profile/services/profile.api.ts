import { apiGet, apiPost, apiDelete } from "../../../shared/api/http-client";
import type { AccountSession } from "../types/profile.types";

export const profileApi = {
  sessions: () => apiGet<AccountSession[]>("/auth/sessions"),
  changePassword: (oldPassword: string, newPassword: string) =>
    apiPost("/auth/change-password", { oldPassword, newPassword }),
  revokeSession: (id: string) => apiDelete(`/auth/sessions/${id}`),
};
