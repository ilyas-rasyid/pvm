import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { purchaseOrdersApi } from "../services/purchase-orders.api";

export function usePoForm() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"DIRECT" | "RFQ">("DIRECT");
  const [requestId, setRequestId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [reason, setReason] = useState("");
  const [rfqId, setRfqId] = useState("");
  const [qty, setQty] = useState<Record<string, number>>({});
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const queue = useQuery({
    queryKey: ["procurement", "queue"],
    queryFn: () => purchaseOrdersApi.listQueue(),
  });
  const vendors = useQuery({
    queryKey: ["vendors", "options"],
    queryFn: () => purchaseOrdersApi.listVendors(),
  });
  const periods = useQuery({
    queryKey: ["periods"],
    queryFn: () => purchaseOrdersApi.listPeriods(),
  });
  const locations = useQuery({
    queryKey: ["locations"],
    queryFn: () => purchaseOrdersApi.listLocations(),
  });
  const rfqs = useQuery({
    queryKey: ["rfqs", "options"],
    queryFn: () => purchaseOrdersApi.listRfqs(),
  });
  const rfq = useQuery({
    queryKey: ["rfq", "detail", rfqId],
    queryFn: () => purchaseOrdersApi.getRfq(rfqId),
    enabled: !!rfqId,
  });
  const source = queue.data?.find((r) => r.id === requestId);
  useEffect(() => {
    if (mode === "RFQ" && rfq.data) {
      setRequestId(rfq.data.requestId);
    }
  }, [mode, rfq.data]);
  const awarded = rfq.data?.award?.lines || [];
  const vendorAwards = awarded.filter((l) => {
    const qLine = rfq.data?.quotations
      .flatMap((q) =>
        q.revisions.flatMap((r) => r.lines.map((line) => ({ ...line, vendorId: q.vendorId }))),
      )
      .find((q) => q.id === l.quotationLineId);
    return qLine?.vendorId === vendorId && l.quantity > l.issuedQty;
  });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      let directExceptionId: string | undefined;
      if (mode === "DIRECT") {
        const exception = await purchaseOrdersApi.registerDirectPurchase({
          requestId,
          vendorId,
          reason,
        });
        directExceptionId = exception.id;
      }
      const lines =
        mode === "DIRECT"
          ? (source?.lines || [])
            .filter((l) => (qty[l.id] ?? 0) > 0)
            .map((l) => ({
              requestLineId: l.id,
              quantity: qty[l.id],
              price: prices[l.id] || String(l.estimatedPrice),
              taxRate: "0",
            }))
          : vendorAwards.map((l) => {
            const offer = rfq.data?.quotations
              .flatMap((q) => q.revisions.flatMap((r) => r.lines))
              .find((q) => q.id === l.quotationLineId);
            const rfqLine = rfq.data?.lines.find((x) => x.id === l.rfqLineId);
            return {
              requestLineId: rfqLine?.requestLineId,
              awardLineId: l.id,
              quantity: qty[l.id] || l.quantity - l.issuedQty,
              price: offer?.price || "0",
              taxRate: offer?.taxRate || "0",
            };
          });
      const po = await purchaseOrdersApi.create({
        requestId,
        vendorId,
        fiscalPeriodId: periodId,
        deliveryLocationId: locationId || null,
        sourcingMode: mode,
        directExceptionId,
        lines,
      });
      await navigate({ to: `/app/purchase-orders/${po.id}` as "/app" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create purchase order");
    } finally {
      setBusy(false);
    }
  }
  return {
    navigate,
    mode,
    setMode,
    requestId,
    setRequestId,
    vendorId,
    setVendorId,
    periodId,
    setPeriodId,
    locationId,
    setLocationId,
    reason,
    setReason,
    rfqId,
    setRfqId,
    qty,
    setQty,
    prices,
    setPrices,
    busy,
    setBusy,
    error,
    setError,
    queue,
    vendors,
    periods,
    locations,
    rfqs,
    rfq,
    source,
    awarded,
    vendorAwards,
    save,
  };
}
