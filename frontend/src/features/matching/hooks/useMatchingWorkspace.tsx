import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { matchingApi } from "../services/matching.api";

export function useMatchingWorkspace({ id }: { id: string }) {
  const client = useQueryClient();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const { data, isPending, refetch } = useQuery({
    queryKey: ["document", "invoice", id],
    queryFn: () => matchingApi.getInvoice(id),
  });
  async function action(cmd: string) {
    if (
      !confirm(
        cmd === "match"
          ? "Run three-way matching for every invoice line?"
          : "Mark this invoice ready for payment? This action is final in the MVP.",
      )
    ) {
      return;
    }
    setBusy(cmd);
    setError("");
    try {
      await matchingApi.execute(id, cmd);
      await client.invalidateQueries({ queryKey: ["list"] });
      await client.invalidateQueries({ queryKey: ["dashboard"] });
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy("");
    }
  }
  return {
    client,
    busy,
    setBusy,
    error,
    setError,
    data,
    isPending,
    refetch,
    action,
  };
}
