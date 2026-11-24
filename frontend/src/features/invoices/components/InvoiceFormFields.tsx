
import { Field, Actions } from "../../../shared/ui/forms/FormFrame";
import type { useInvoiceForm } from "../hooks/useInvoiceForm";

type InvoiceFormFieldsProps = {
  model: ReturnType<typeof useInvoiceForm>;
};

export function InvoiceFormFields({ model }: InvoiceFormFieldsProps) {
  const {
    navigate,
    orderId,
    setOrderId,
    number,
    setNumber,
    invoiceDate,
    setInvoiceDate,
    qty,
    setQty,
    prices,
    setPrices,
    busy,
    setBusy,
    error,
    setError,
    orders,
    order,
    save,
  } = model;

  return (
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
  );
}
