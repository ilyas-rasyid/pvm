import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { sourcingApi } from "../services/sourcing.api";

export function useRfqForm() {
  const navigate = useNavigate();
  const [requestId, setRequestId] = useState("");
  const [deadline, setDeadline] = useState("");
  const [vendorIds, setVendorIds] = useState<string[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const queue = useQuery({
    queryKey: ["procurement", "queue"],
    queryFn: () => sourcingApi.listApprovedRequests(),
  });
  const vendors = useQuery({
    queryKey: ["vendors", "options"],
    queryFn: () => sourcingApi.listVendors(),
  });
  const selected = queue.data?.find((r) => r.id === requestId);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const lines = (selected?.lines || [])
        .filter((l) => (qty[l.id] ?? l.approvedQty - l.awardedQty - l.issuedQty) > 0)
        .map((l) => ({
          requestLineId: l.id,
          quantity: qty[l.id] ?? l.approvedQty - l.awardedQty - l.issuedQty,
        }));
      const rfq = await sourcingApi.createRfq({
        requestId,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        lines,
        vendorIds,
      });
      await navigate({ to: `/app/rfqs/${rfq.id}` as "/app" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create RFQ");
    } finally {
      setBusy(false);
    }
  }
  return {
    navigate,
    requestId,
    setRequestId,
    deadline,
    setDeadline,
    vendorIds,
    setVendorIds,
    qty,
    setQty,
    busy,
    setBusy,
    error,
    setError,
    queue,
    vendors,
    selected,
    save,
  };
}
