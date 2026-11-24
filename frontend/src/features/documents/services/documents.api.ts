import { apiGet, apiPost } from "../../../shared/api/http-client";
import type { EntityRow } from "../../../shared/types/models";

export const documentsApi = {
  detail: (path: string) => apiGet<EntityRow>(path),
  action: (path: string, command: string, payload: Record<string, unknown>) =>
    apiPost(`${path}/${command}`, payload, path),
};
