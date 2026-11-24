import { useQuery } from "@tanstack/react-query";

import { apiGet } from "../../../shared/api/http-client";
import type { User } from "../../../shared/types/models";
export const authKey = ["auth", "me"] as const;
export function useAuth() {
  return useQuery({
    queryKey: authKey,
    queryFn: () => apiGet<User>("/auth/me"),
    retry: false,
    staleTime: 30000,
  });
}
