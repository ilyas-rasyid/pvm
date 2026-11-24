import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { documentsApi } from "../services/documents.api";
import { useAuth } from "../../auth/hooks/useAuth";
import { urls } from "../config/document-config";
import type { Kind } from "../config/document-config";
import { getDocumentActions } from "../utils/document-actions";
export function useDocumentDetail({ kind, id }: { kind: Kind; id: string }) {
  const { data: user } = useAuth();
  const client = useQueryClient();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const path = `${urls[kind]}/${id}`;
  const {
    data,
    refetch,
    isPending,
    error: loadError,
  } = useQuery({ queryKey: ["document", kind, id], queryFn: () => documentsApi.detail(path) });
  const status = String(data?.status || "");
  const actions = getDocumentActions(kind, status, data, user, id);
  async function act(action: string, needsReason: boolean) {
    if (needsReason && reason.trim().length < 5) {
      setError("Provide a reason with at least five characters");
      return;
    }
    if (
      !confirm(
        `Confirm ${action.replaceAll("-", " ")} for ${String(data?.reference || data?.number || id)}?`,
      )
    ) {
      return;
    }
    setBusy(action);
    setError("");
    try {
      await documentsApi.action(path, action, needsReason ? { reason } : {});
      await client.invalidateQueries({ queryKey: ["document", kind, id] });
      await client.invalidateQueries({ queryKey: ["list"] });
      await client.invalidateQueries({ queryKey: ["dashboard"] });
      await refetch();
      setReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setBusy("");
    }
  }
  return {
    user,
    client,
    busy,
    setBusy,
    error,
    setError,
    reason,
    setReason,
    path,
    data,
    refetch,
    isPending,
    loadError,
    status,
    actions,
    act,
  };
}
