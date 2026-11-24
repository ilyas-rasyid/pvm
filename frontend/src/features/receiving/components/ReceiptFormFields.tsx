
import { Field, Actions } from "../../../shared/ui/forms/FormFrame";
import type { useReceiptForm } from "../hooks/useReceiptForm";

type ReceiptFormFieldsProps = {
  model: ReturnType<typeof useReceiptForm>;
};

export function ReceiptFormFields({ model }: ReceiptFormFieldsProps) {
  const {
    navigate,
    orderId,
    setOrderId,
    deliveryReference,
    setDeliveryReference,
    note,
    setNote,
    values,
    setValues,
    busy,
    setBusy,
    error,
    setError,
    expected,
    order,
    patch,
    save,
  } = model;

  return (
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
  );
}
