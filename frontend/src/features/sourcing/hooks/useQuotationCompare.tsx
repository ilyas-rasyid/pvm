import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { quotationComparisonApi } from "../services/quotation-comparison.api";

export function useQuotationCompare({ id }: { id: string }) {
  const navigate = useNavigate();
  const [selection, setSelection] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { data, isPending } = useQuery({
    queryKey: ["rfq", "comparison", id],
    queryFn: async () => {
      await quotationComparisonApi.getRfq(id);
      return quotationComparisonApi.getComparison(id);
    },
  });
  async function award() {
    setBusy(true);
    setError("");
    try {
      const lines =
        data?.quotations.flatMap((q) =>
          q.revisions.slice(0, 1).flatMap((r) =>
            r.lines
              .filter((l) => (selection[l.id] || 0) > 0)
              .map((l) => ({
                rfqLineId: l.rfqLineId,
                quotationLineId: l.id,
                quantity: selection[l.id],
              })),
          ),
        ) || [];
      if (!lines.length) {
        throw new Error("Select at least one quantity to award");
      }
      await quotationComparisonApi.award(id, reason, lines);
      await navigate({ to: `/app/rfqs/${id}` as "/app" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Award failed");
    } finally {
      setBusy(false);
    }
  }
  return {
    navigate,
    selection,
    setSelection,
    reason,
    setReason,
    busy,
    setBusy,
    error,
    setError,
    data,
    isPending,
    award,
  };
}
