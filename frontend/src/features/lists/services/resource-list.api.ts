import { apiGetCollection } from "../../../shared/api/http-client";
import type { EntityRow } from "../../../shared/types/models";

export const resourceListApi = {
  list: (endpoint: string) => apiGetCollection<EntityRow>(endpoint),
};
