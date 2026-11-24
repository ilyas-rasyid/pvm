import { useQuery, useQueryClient } from "@tanstack/react-query";

import { notificationsApi } from "../services/notifications.api";

export function useNotifications() {
  const client = useQueryClient();
  const { data, isPending, error } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(),
  });
  async function mark(id?: string) {
    await notificationsApi.markRead(id);
    await client.invalidateQueries({ queryKey: ["notifications"] });
  }
  return {
    client,
    data,
    isPending,
    error,
    mark,
  };
}
