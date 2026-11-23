import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiGet, apiPost } from "../../../shared/api/http-client";
import { FormFrame, Field, Actions } from "../components/FormFrame";
import type { Order, EntityRow } from "../../../shared/types/models";

export function InvoiceFormPage() {
  const navigate = useNavigate();
  const [orderId, setOrderId] = useState("");
  const [number, setNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [qty, setQty] = useState<Record<string, number>>({});
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const orders = useQuery({
    queryKey: ["po", "options"],
    queryFn: () => apiGet<Order[]>("/purchase-orders?pageSize=100"),
  });
  const order = useQuery({
    queryKey: ["po", orderId],
    queryFn: () => apiGet<Order>(`/purchase-orders/${orderId}`),
    enabled: !!orderId,
  });
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const lines = (order.data?.lines || [])
        .filter((l) => (qty[l.id] || 0) > 0)
        .map((l) => ({
          orderLineId: l.id,
          quantity: qty[l.id],
          price: prices[l.id] || String(l.price),
          taxRate: String(l.taxRate),
        }));
      const invoice = await apiPost<EntityRow>("/invoices", {
        orderId,
        vendorId: order.data?.vendorId,
        number,
        invoiceDate,
        lines,
      });
      await navigate({ to: `/app/invoices/${invoice.id}` as "/app" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cannot create invoice");
    } finally {
      setBusy(false);
    }
  }
  return (
    <FormFrame
      title="Record vendor invoice"
      description="A vendor invoice stays draft until submitted and matched against accepted goods."
      error={error}
    >
      <form onSubmit={save}>
        <section className="form-section">
          <h3>Invoice identity</h3>
          <div className="form-grid">
            <Field label="Purchase order">
              <select
                required
                value={orderId}
                onChange={(e) => {
                  setOrderId(e.target.value);
                  setQty({});
                  setPrices({});
                }}
              >
                <option value="">Select PO</option>
                {(orders.data || [])
                  .filter((o) =>
                    ["ISSUED", "PARTIALLY_RECEIVED", "FULLY_RECEIVED"].includes(String(o.status)),
                  )
                  .map((o) => (
                    <option
                      key={o.id}
                      value={o.id}
                    >
                      {o.reference}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Vendor invoice number">
              <input
                required
                minLength={2}
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />
            </Field>
            <Field label="Invoice date">
              <input
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </Field>
          </div>
        </section>
        <section className="form-section">
          <h3>Invoice lines</h3>
          {order.data?.lines.map((l) => (
            <div
              className="field-row field-array"
              key={l.id}
            >
              <div className="description-cell">
                <strong>{l.description}</strong>
                <div className="small muted">
                  Accepted: {l.acceptedQty} · Allocated: {l.invoicedQty} · Available:{" "}
                  {l.acceptedQty - l.invoicedQty}
                </div>
              </div>
              <Field label="Invoiced qty">
                <input
                  type="number"
                  min={0}
                  max={l.acceptedQty - l.invoicedQty}
                  value={qty[l.id] ?? 0}
                  onChange={(e) => setQty((v) => ({ ...v, [l.id]: Number(e.target.value) }))}
                />
              </Field>
              <Field label="Unit price (IDR)">
                <input
                  value={prices[l.id] ?? String(l.price)}
                  onChange={(e) => setPrices((v) => ({ ...v, [l.id]: e.target.value }))}
                />
              </Field>
            </div>
          ))}
          <p className="form-help">
            Submitting this form does not verify payment. Matching and final verification are
            separate steps.
          </p>
          <Actions
            busy={busy}
            label="Save invoice draft"
          />
        </section>
      </form>
    </FormFrame>
  );
}
