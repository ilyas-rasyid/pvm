import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../../shared/api/http-client";
import { FormFrame, Field, Actions } from "../components/FormFrame";
import type { EntityRow, PurchaseRequest } from "../../../shared/types/models";

type RfqAward = {
  id: string;
  lines: {
    id: string;
    rfqLineId: string;
    quotationLineId: string;
    quantity: number;
    issuedQty: number;
  }[];
};
type Rfq = {
  id: string;
  reference: string;
  requestId: string;
  status: string;
  lines: {
    id: string;
    requestLineId: string;
    quantity: number;
  }[];
  award: RfqAward | null;
  quotations: {
    vendorId: string;
    revisions: {
      lines: {
        id: string;
        rfqLineId: string;
        price: string;
        taxRate: string;
      }[];
    }[];
  }[];
};
export function PoFormPage() {
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
    queryFn: () => apiGet<PurchaseRequest[]>("/procurement/queue"),
  });
  const vendors = useQuery({
    queryKey: ["vendors", "options"],
    queryFn: () => apiGet<EntityRow[]>("/vendors?pageSize=100"),
  });
  const periods = useQuery({
    queryKey: ["periods"],
    queryFn: () => apiGet<EntityRow[]>("/admin/fiscal-periods"),
  });
  const locations = useQuery({
    queryKey: ["locations"],
    queryFn: () => apiGet<EntityRow[]>("/admin/delivery-locations"),
  });
  const rfqs = useQuery({
    queryKey: ["rfqs", "options"],
    queryFn: () => apiGet<Rfq[]>("/rfqs?pageSize=100"),
  });
  const rfq = useQuery({
    queryKey: ["rfq", "detail", rfqId],
    queryFn: () => apiGet<Rfq>(`/rfqs/${rfqId}`),
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
        const exception = await apiPost<EntityRow>("/direct-purchase-exceptions", {
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
      const po = await apiPost<EntityRow>("/purchase-orders", {
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
  return (
    <FormFrame
      title="New purchase order"
      description="Prepare an order from an approved PR and an authorized sourcing decision."
      error={error}
    >
      <form onSubmit={save}>
        <section className="form-section">
          <h3>Sourcing method</h3>
          <div className="inline-list">
            <label className="inline-list">
              <input
                type="radio"
                checked={mode === "DIRECT"}
                onChange={() => setMode("DIRECT")}
              />{" "}
              Direct purchase
            </label>
            <label className="inline-list">
              <input
                type="radio"
                checked={mode === "RFQ"}
                onChange={() => setMode("RFQ")}
              />{" "}
              Awarded RFQ
            </label>
          </div>
          <div
            className="form-grid"
            style={{ marginTop: 17 }}
          >
            {mode === "DIRECT" ? (
              <Field label="Approved purchase request">
                <select
                  required
                  value={requestId}
                  onChange={(e) => setRequestId(e.target.value)}
                >
                  <option value="">Select request</option>
                  {(queue.data || []).map((r) => (
                    <option
                      key={r.id}
                      value={r.id}
                    >
                      {r.reference} · {r.title}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <Field label="Awarded RFQ">
                <select
                  required
                  value={rfqId}
                  onChange={(e) => {
                    setRfqId(e.target.value);
                    setVendorId("");
                  }}
                >
                  <option value="">Select awarded RFQ</option>
                  {(rfqs.data || [])
                    .filter((r) => r.status === "AWARDED")
                    .map((r) => (
                      <option
                        key={r.id}
                        value={r.id}
                      >
                        {r.reference}
                      </option>
                    ))}
                </select>
              </Field>
            )}
            <Field label="Vendor">
              <select
                required
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
              >
                <option value="">Select vendor</option>
                {(vendors.data || [])
                  .filter((v) => v.active)
                  .map((v) => (
                    <option
                      key={v.id}
                      value={v.id}
                    >
                      {v.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Fiscal period">
              <select
                required
                value={periodId}
                onChange={(e) => setPeriodId(e.target.value)}
              >
                <option value="">Select period</option>
                {(periods.data || [])
                  .filter((p) => p.status === "OPEN")
                  .map((p) => (
                    <option
                      key={p.id}
                      value={p.id}
                    >
                      {String(p.code || p.id)}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Delivery location">
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
              >
                <option value="">No location selected</option>
                {(locations.data || []).map((l) => (
                  <option
                    key={l.id}
                    value={l.id}
                  >
                    {l.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {mode === "DIRECT" && (
            <div style={{ marginTop: 16 }}>
              <Field label="Direct purchase justification">
                <textarea
                  required
                  minLength={10}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain why direct sourcing is appropriate"
                />
              </Field>
            </div>
          )}
        </section>
        <section className="form-section">
          <h3>Purchase order lines</h3>
          {mode === "DIRECT"
            ? source?.lines.map((l) => (
                <div
                  className="field-row field-array"
                  key={l.id}
                >
                  <div className="description-cell">
                    <strong>{l.description}</strong>
                    <div className="small muted">
                      Available: {l.approvedQty - l.awardedQty - l.issuedQty}
                    </div>
                  </div>
                  <Field label="Quantity">
                    <input
                      type="number"
                      min={0}
                      max={l.approvedQty - l.awardedQty - l.issuedQty}
                      value={qty[l.id] ?? 0}
                      onChange={(e) => setQty((v) => ({ ...v, [l.id]: Number(e.target.value) }))}
                    />
                  </Field>
                  <Field label="Unit price">
                    <input
                      value={prices[l.id] ?? String(l.estimatedPrice)}
                      onChange={(e) => setPrices((v) => ({ ...v, [l.id]: e.target.value }))}
                    />
                  </Field>
                </div>
              ))
            : vendorAwards.map((l) => (
                <div
                  className="field-row field-array"
                  key={l.id}
                >
                  <div className="description-cell">Awarded item · {l.rfqLineId.slice(0, 8)}</div>
                  <Field label="Quantity">
                    <input
                      type="number"
                      min={1}
                      max={l.quantity - l.issuedQty}
                      value={qty[l.id] ?? l.quantity - l.issuedQty}
                      onChange={(e) => setQty((v) => ({ ...v, [l.id]: Number(e.target.value) }))}
                    />
                  </Field>
                </div>
              ))}
          <p className="form-help">
            PO issue occurs after draft review and a final budget validation.
          </p>
          <Actions
            busy={busy}
            label="Save purchase order draft"
          />
        </section>
      </form>
    </FormFrame>
  );
}
