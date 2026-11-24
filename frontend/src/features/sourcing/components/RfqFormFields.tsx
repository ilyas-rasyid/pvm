
import { Field, Actions } from "../../../shared/ui/forms/FormFrame";
import type { useRfqForm } from "../hooks/useRfqForm";

type RfqFormFieldsProps = {
  model: ReturnType<typeof useRfqForm>;
};

export function RfqFormFields({ model }: RfqFormFieldsProps) {
  const {
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
  } = model;

  return (
    <form onSubmit={save}>
      <section className="form-section">
        <h3>Sourcing context</h3>
        <div className="form-grid">
          <Field label="Approved purchase request">
            <select
              required
              value={requestId}
              onChange={(e) => {
                setRequestId(e.target.value);
                setQty({});
              }}
            >
              <option value="">Choose approved request</option>
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
          <Field label="Quotation deadline">
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </Field>
        </div>
      </section>
      <section className="form-section">
        <h3>Required quantities</h3>
        {!selected ? (
          <p className="muted">Choose an approved PR to select the requested items.</p>
        ) : (
          <div className="stack">
            {selected.lines.map((line) => (
              <div
                className="flex-between"
                key={line.id}
              >
                <div>
                  <strong>{line.description}</strong>
                  <div className="small muted">
                    Available: {line.approvedQty - line.awardedQty - line.issuedQty} units
                  </div>
                </div>
                <input
                  className="input"
                  aria-label={`Quantity ${line.description}`}
                  style={{ width: 115 }}
                  type="number"
                  min={0}
                  max={line.approvedQty - line.awardedQty - line.issuedQty}
                  value={
                    qty[line.id] ??
                    Math.max(0, line.approvedQty - line.awardedQty - line.issuedQty)
                  }
                  onChange={(e) => setQty((v) => ({ ...v, [line.id]: Number(e.target.value) }))}
                />
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="form-section">
        <h3>Invited vendors</h3>
        <p
          className="form-help"
          style={{ marginBottom: 12 }}
        >
          Select vendors whose quotations will be recorded by procurement.
        </p>
        <div className="form-grid">
          {(vendors.data || [])
            .filter((v) => v.active)
            .map((v) => (
              <label
                key={v.id}
                className="inline-list"
                style={{ fontSize: 12 }}
              >
                <input
                  type="checkbox"
                  checked={vendorIds.includes(v.id)}
                  onChange={(e) =>
                    setVendorIds((prev) =>
                      e.target.checked ? [...prev, v.id] : prev.filter((id) => id !== v.id),
                    )
                  }
                />
                {v.name}
              </label>
            ))}
        </div>
        <Actions
          busy={busy}
          label="Create RFQ draft"
        />
      </section>
    </form>
  );
}
