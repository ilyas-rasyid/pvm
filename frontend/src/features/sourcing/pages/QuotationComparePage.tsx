import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { useQuotationCompare } from "../hooks/useQuotationCompare";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { ErrorNotice, Loading } from "../../../shared/ui/Feedback";
import { rupiah } from "../../../shared/formatters/value";

export function QuotationComparePage({ id }: { id: string }) {
  const {
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
  } = useQuotationCompare({ id });
  if (isPending) {
    return (
      <main className="page">
        <Loading />
      </main>
    );
  }
  return (
    <main className="page">
      <PageHeader
        eyebrow="SOURCING DECISION"
        title={`Compare vendor quotations · ${data?.reference}`}
        description="Review pricing, quantity and lead time line by line; the lowest quote is not automatically selected."
      />
      {error && (
        <div style={{ marginBottom: 16 }}>
          <ErrorNotice message={error} />
        </div>
      )}
      {data?.lines.map((line) => (
        <section
          className="card"
          style={{ marginBottom: 17 }}
          key={line.id}
        >
          <div className="section-header">
            <div>
              <h2 className="card-title">{line.requestLine.description}</h2>
              <p className="card-description">RFQ requested quantity: {line.quantity}</p>
            </div>
          </div>
          <div className="card-pad">
            <div className="compare-grid">
              {data.quotations.flatMap((q) =>
                q.revisions.slice(0, 1).flatMap((r) =>
                  r.lines
                    .filter((l) => l.rfqLineId === line.id)
                    .map((l) => (
                      <div
                        className="comparison-column"
                        key={l.id}
                      >
                        <h3>{q.vendor.name}</h3>
                        <div className="muted small">Price per unit</div>
                        <div style={{ fontSize: 20, fontWeight: 750, margin: "6px 0 14px" }}>
                          {rupiah(l.price)}
                        </div>
                        <p className="small muted">
                          Offered: {l.quantity} units · Lead: {r.leadDays} days
                        </p>
                        <label className="form-field">
                          Award quantity
                          <input
                            type="number"
                            min={0}
                            max={l.quantity}
                            value={selection[l.id] || 0}
                            onChange={(e) =>
                              setSelection((v) => ({ ...v, [l.id]: Number(e.target.value) }))
                            }
                          />
                        </label>
                      </div>
                    )),
                ),
              )}
            </div>
            <p className="form-help">
              Awarded:{" "}
              {data.quotations.reduce(
                (s, q) =>
                  s +
                  q.revisions
                    .slice(0, 1)
                    .reduce(
                      (s2, r) =>
                        s2 +
                        r.lines
                          .filter((l) => l.rfqLineId === line.id)
                          .reduce((n, l) => n + (selection[l.id] || 0), 0),
                      0,
                    ),
                0,
              )}{" "}
              / {line.quantity} units
            </p>
          </div>
        </section>
      ))}
      <section className="card">
        <div className="form-section">
          <h3>Finalize sourcing decision</h3>
          <label className="form-field">
            Reason for award
            <textarea
              required
              minLength={5}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="State commercial rationale for vendor selection"
            />
          </label>
          <div className="form-actions">
            <button
              className="button"
              onClick={() => history.back()}
            >
              <ArrowLeft size={14} />
              Back
            </button>
            <button
              className="button primary"
              disabled={busy || reason.trim().length < 5}
              onClick={award}
            >
              <CheckCircle2 size={15} />
              {busy ? "Finalizing…" : "Award selected quantities"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
