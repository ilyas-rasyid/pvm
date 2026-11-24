
import { Link } from "@tanstack/react-router";
import { FileCheck2, AlertTriangle } from "lucide-react";

import { PageHeader } from "../../../shared/ui/PageHeader";
import { StatusBadge } from "../../../shared/ui/StatusBadge";
import { ErrorNotice, Loading } from "../../../shared/ui/Feedback";
import { rupiah } from "../../../shared/formatters/value";
import type { Invoice } from "../../../shared/types/models";
import { useMatchingWorkspace } from "../hooks/useMatchingWorkspace";

export function MatchingWorkspacePage({ id }: { id: string }) {
  const {
    client,
    busy,
    setBusy,
    error,
    setError,
    data,
    isPending,
    refetch,
    action,
  } = useMatchingWorkspace({ id });
  if (isPending) {
    return (
      <main className="page">
        <Loading />
      </main>
    );
  }
  if (!data) {
    return (
      <main className="page">
        <ErrorNotice message="Invoice not found" />
      </main>
    );
  }
  return (
    <main className="page">
      <PageHeader
        eyebrow="FINANCE · THREE-WAY MATCHING"
        title={`Invoice ${data.number}`}
        description="Verify vendor invoice lines against issued purchase orders and accepted receipt quantities."
        actions={
          <Link
            className="button"
            to={`/app/invoices/${id}` as "/app"}
          >
            Back to invoice
          </Link>
        }
      />
      {error && (
        <div style={{ marginBottom: 16 }}>
          <ErrorNotice message={error} />
        </div>
      )}
      <section
        className="card"
        style={{ marginBottom: 18 }}
      >
        <div className="card-pad flex-between">
          <div>
            <span className="eyebrow">CURRENT RESULT</span>
            <div style={{ marginTop: 7 }}>
              <StatusBadge status={String(data.status)} />
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="small muted">Invoice total</div>
            <div style={{ fontSize: 23, fontWeight: 780 }}>{rupiah(data.total)}</div>
          </div>
        </div>
      </section>
      {data.lines.map((l) => {
        const poLine = data.order.lines.find((x) => x.id === l.orderLineId);
        const available = (poLine?.acceptedQty || 0) - (poLine?.invoicedQty || 0);
        const priceOk = String(poLine?.price) === String(l.price);
        return (
          <section
            className="card"
            style={{ marginBottom: 16 }}
            key={l.id}
          >
            <div className="section-header">
              <h2 className="card-title">{poLine?.description || l.orderLineId}</h2>
              {priceOk && l.quantity <= available ? (
                <StatusBadge status="MATCHED" />
              ) : (
                <StatusBadge status="DISCREPANCY" />
              )}
            </div>
            <div className="card-pad">
              <div className="comparison-rows">
                <div className="comparison-cell">
                  <div className="eyebrow">PURCHASE ORDER</div>
                  <div className="value">{poLine?.quantity || 0} units</div>
                  <div className="small muted">Unit price {rupiah(poLine?.price)}</div>
                </div>
                <div className="comparison-cell">
                  <div className="eyebrow">GOODS RECEIPT</div>
                  <div className="value">{poLine?.acceptedQty || 0} accepted</div>
                  <div className="small muted">Remaining unallocated {available}</div>
                </div>
                <div className="comparison-cell">
                  <div className="eyebrow">VENDOR INVOICE</div>
                  <div className="value">{l.quantity} units</div>
                  <div className="small muted">Unit price {rupiah(l.price)}</div>
                </div>
              </div>
              {!priceOk || l.quantity > available ? (
                <div
                  className="alert warn"
                  style={{ marginTop: 13 }}
                >
                  <AlertTriangle
                    size={14}
                    style={{ display: "inline", marginRight: 8 }}
                  />
                  {priceOk
                    ? `Invoice quantity exceeds available accepted units by ${l.quantity - available}.`
                    : "Invoice unit price differs from the approved purchase order."}
                </div>
              ) : null}
            </div>
          </section>
        );
      })}
      {Array.isArray(data.matches) && data.matches.length > 0 && (
        <section
          className="card"
          style={{ marginBottom: 18 }}
        >
          <div className="section-header">
            <h2 className="card-title">Matching attempts</h2>
          </div>
          <div className="card-pad stack">
            {(
              data.matches as {
                id: string;
                result: string;
                discrepancies: {
                  id: string;
                  description: string;
                }[];
              }[]
            ).map((m) => (
              <div
                className="alert"
                key={m.id}
              >
                <StatusBadge status={m.result} />
                {m.discrepancies.map((d) => (
                  <p key={d.id}>{d.description}</p>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}
      {data.status === "SUBMITTED" || data.status === "MATCHED" ? (
        <section className="card">
          <div className="form-section flex-between">
            <div>
              <h3 style={{ margin: 0 }}>
                {data.status === "SUBMITTED" ? "Run invoice matching" : "Final verification"}
              </h3>
              <p
                className="muted small"
                style={{ marginTop: 7 }}
              >
                {data.status === "SUBMITTED"
                  ? "Matching commits allocations only when all lines pass."
                  : "Final verification moves commitment into verified invoiced, not paid."}
              </p>
            </div>
            <button
              className="button primary"
              disabled={!!busy}
              onClick={() => action(data.status === "SUBMITTED" ? "match" : "final-verify")}
            >
              <FileCheck2 size={15} />
              {busy
                ? "Processing…"
                : data.status === "SUBMITTED"
                  ? "Run matching"
                  : "Mark ready for payment"}
            </button>
          </div>
        </section>
      ) : null}
    </main>
  );
}
