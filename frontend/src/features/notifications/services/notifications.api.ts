import { apiGet, apiPost } from "../../../shared/api/http-client";
import type { NotificationItem } from "../types/notification.types";

export const notificationsApi = {
  list: () => apiGet<NotificationItem[]>("/notifications/"),
  markRead: (id?: string) =>
    apiPost(id ? `/notifications/${id}/read` : "/notifications/read-all"),
};
