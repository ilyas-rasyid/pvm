import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../../shared/api/http-client";
import { FormFrame, Field, Actions } from "../components/FormFrame";
import type { Order, EntityRow } from "../../../shared/types/models";

type Count = {
  deliveredQty: number;
  acceptedQty: number;
  rejectedQty: number;
};
export function ReceiptFormPage() {
  const navigate = useNavigate();
  const [orderId, setOrderId] = useState("");
  const [deliveryReference, setDeliveryReference] = useState("");
  const [note, setNote] = useState("");
  const [values, setValues] = useState<Record<string, Count>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const expected = useQuery({
    queryKey: ["receiving", "expected"],
    queryFn: () => apiGet<Order[]>("/receiving/expected"),
  });
  const order = useQuery({
    queryKey: ["po", orderId],
    queryFn: () => apiGet<Order>(`/purchase-orders/${orderId}`),
    enabled: !!orderId,
  });
  function patch(id: string, key: keyof Count, val: number) {
    setValues((old) => {
      const next = {
        ...(old[id] || { deliveredQty: 0, acceptedQty: 0, rejectedQty: 0 }),
        [key]: val,
      };
      if (key === "acceptedQty" || key === "rejectedQty")
        next.deliveredQty = next.acceptedQty + next.rejectedQty;
      return { ...old, [id]: next };
    });
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const lines = (order.data?.lines || [])
        .filter((l) => (values[l.id]?.deliveredQty || 0) > 0)
        .map((l) => ({ orderLineId: l.id, ...values[l.id] }));
      const rec = await apiPost<EntityRow>("/goods-receipts", {
        orderId,
        deliveryReference,
        note,
        lines,
      });
      await navigate({ to: `/app/receipts/${rec.id}` as "/app" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create receipt");
    } finally {
      setBusy(false);
    }
  }
  return (
    <FormFrame
      title="Record goods receipt"
      description="Log delivered, accepted, and rejected units without exceeding the PO."
      error={error}
    >
      <form onSubmit={save}>
        <section className="form-section">
          <h3>Delivery information</h3>
          <div className="form-grid">
            <Field label="Purchase order">
              <select
                required
                value={orderId}
                onChange={(e) => {
                  setOrderId(e.target.value);
                  setValues({});
                }}
              >
                <option value="">Select open PO</option>
                {(expected.data || []).map((o) => (
                  <option
                    key={o.id}
                    value={o.id}
                  >
                    {o.reference}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Delivery note reference">
              <input
                required
                minLength={2}
                value={deliveryReference}
                onChange={(e) => setDeliveryReference(e.target.value)}
              />
            </Field>
          </div>
          <div style={{ marginTop: 17 }}>
            <Field label="Condition notes">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Packaging and delivery observations"
              />
            </Field>
          </div>
        </section>
        <section className="form-section">
          <h3>Receiving lines</h3>
          {order.data?.lines.map((l) => {
            const v = values[l.id] || { deliveredQty: 0, acceptedQty: 0, rejectedQty: 0 };
            return (
              <div
                className="field-array"
                key={l.id}
              >
                <div
                  className="flex-between"
                  style={{ marginBottom: 12 }}
                >
                  <strong>{l.description}</strong>
                  <span className="muted small">Remaining: {l.quantity - l.acceptedQty}</span>
                </div>
                <div className="form-grid">
                  <Field label="Accepted">
                    <input
                      type="number"
                      min={0}
                      max={l.quantity - l.acceptedQty}
                      value={v.acceptedQty}
                      onChange={(e) => patch(l.id, "acceptedQty", Number(e.target.value))}
                    />
                  </Field>
                  <Field label="Rejected">
                    <input
                      type="number"
                      min={0}
                      value={v.rejectedQty}
                      onChange={(e) => patch(l.id, "rejectedQty", Number(e.target.value))}
                    />
                  </Field>
                </div>
                <p className="form-help">
                  Delivered: {v.deliveredQty} · Accepted: {v.acceptedQty} · Rejected:{" "}
                  {v.rejectedQty}
                </p>
              </div>
            );
          })}
          <Actions
            busy={busy}
            label="Save receipt draft"
          />
        </section>
      </form>
    </FormFrame>
  );
}
