import { Link } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw, ExternalLink, Send } from "lucide-react";

import { PageHeader } from "../../../shared/ui/PageHeader";
import { StatusBadge } from "../../../shared/ui/StatusBadge";
import { Loading, ErrorNotice } from "../../../shared/ui/Feedback";
import { DocumentLines } from "../components/DocumentLines";
import { rupiah, dateText, cellText } from "../../../shared/formatters/value";
import type { EntityRow } from "../../../shared/types/models";
import { QuotationPanel } from "../../sourcing/components/QuotationPanel";
import { titles, extraFields, human } from "../config/document-config";
import type { Kind } from "../config/document-config";
import { useDocumentDetail } from "../hooks/useDocumentDetail";

export function DocumentDetailPage({ kind, id }: { kind: Kind; id: string }) {
  const {
    user,
    client,
    busy,
    setBusy,
    error,
    setError,
    reason,
    setReason,
    path,
    data,
    refetch,
    isPending,
    loadError,
    status,
    actions,
    act,
  } = useDocumentDetail({ kind, id });
  if (isPending) {
    return (
      <main className="page">
        <Loading />
      </main>
    );
  }
  if (loadError) {
    return (
      <main className="page">
        <ErrorNotice message={loadError.message} />
      </main>
    );
  }
  const lines = (Array.isArray(data?.lines) ? data.lines : []) as {
    id: string;
    description?: string;
    quantity?: number;
  }[];
  const label = String(data?.reference || data?.number || data?.name || id.slice(0, 8));
  return (
    <main className="page">
      <PageHeader
        eyebrow={titles[kind].toUpperCase()}
        title={label}
        description={`Document details and permitted operational actions.`}
        actions={
          <>
            <button
              className="button"
              onClick={() => refetch()}
            >
              <RefreshCw size={14} />
              Refresh
            </button>
            <Link
              className="button"
              to="/app"
            >
              <ArrowLeft size={14} />
              Overview
            </Link>
          </>
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
        <div className="section-header">
          <h2 className="card-title">Document overview</h2>
          {status && <StatusBadge status={status} />}
        </div>
        <div className="card-pad">
          <dl className="detail-meta">
            {extraFields[kind].map((field) => (
              <div key={field}>
                <dt>{human(field)}</dt>
                <dd>
                  {field === "departmentId" &&
                  (data?.departmentName ||
                    (typeof data?.department === "string"
                      ? data.department
                      : (data?.department as { name?: string } | undefined)?.name))
                    ? String(
                        data?.departmentName ||
                          (typeof data?.department === "string"
                            ? data.department
                            : (data?.department as { name?: string } | undefined)?.name),
                      )
                    : /total|price|allocated|committed|verified|available/i.test(field)
                      ? rupiah(data?.[field])
                      : /At$|By$|Date$/.test(field)
                        ? dateText(data?.[field])
                        : cellText(data?.[field])}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      {lines.length > 0 && (
        <section
          className="card"
          style={{ marginBottom: 18 }}
        >
          <div className="section-header">
            <h2 className="card-title">Line items</h2>
            <span className="small muted">{lines.length} lines</span>
          </div>
          <DocumentLines
            lines={lines}
            kind={kind}
          />
        </section>
      )}
      {kind === "rfq" && status === "OPEN" && (
        <QuotationPanel
          rfq={data!}
          onSaved={() => refetch()}
        />
      )}
      {kind === "invoice" && (
        <section
          className="card"
          style={{ marginBottom: 18 }}
        >
          <div className="section-header">
            <h2 className="card-title">Matching history</h2>
          </div>
          <div className="card-pad">
            {Array.isArray(data?.matches) && data.matches.length ? (
              (data.matches as EntityRow[]).map((m) => (
                <div
                  className="alert"
                  style={{ marginBottom: 8 }}
                  key={m.id}
                >
                  <StatusBadge status={String(m.result)} />{" "}
                  <span className="muted small">{dateText(m.createdAt)}</span>
                  {Array.isArray(m.discrepancies) &&
                    m.discrepancies.map((d, i) => (
                      <p key={i}>{cellText((d as EntityRow).description)}</p>
                    ))}
                </div>
              ))
            ) : (
              <p className="muted">No matching attempts recorded.</p>
            )}
          </div>
        </section>
      )}
      {actions.length > 0 && (
        <section className="card">
          <div className="section-header">
            <h2 className="card-title">Available actions</h2>
          </div>
          <div className="card-pad stack">
            {actions.some((a) => a.reason) && (
              <label className="form-field">
                Reason (required for rejection/cancellation/closure)
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide an auditable reason"
                />
              </label>
            )}
            <div className="inline-list">
              {actions.map((a) =>
                a.to ? (
                  <Link
                    key={a.command}
                    className="button primary"
                    to={a.to as "/app"}
                  >
                    {a.label}
                    <ExternalLink size={13} />
                  </Link>
                ) : (
                  <button
                    key={a.command}
                    className={`button ${["cancel", "void", "reject"].includes(a.command) ? "danger" : "primary"}`}
                    disabled={!!busy}
                    onClick={() => act(a.command, !!a.reason)}
                  >
                    <Send size={14} />
                    {busy === a.command ? "Processing…" : a.label}
                  </button>
                ),
              )}
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
