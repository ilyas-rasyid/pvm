import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, RefreshCw, ExternalLink, Send } from "lucide-react";
import { apiGet, apiPost } from "../../../shared/api/http-client";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { StatusBadge } from "../../../shared/ui/StatusBadge";
import { Loading, ErrorNotice } from "../../../shared/ui/Feedback";
import { DocumentLines } from "../components/DocumentLines";
import { rupiah, dateText, cellText } from "../../../shared/formatters/value";
import { useAuth } from "../../auth/hooks/useAuth";
import type { EntityRow } from "../../../shared/types/models";
import { QuotationPanel } from "../../sourcing/components/QuotationPanel";

type Kind = "request" | "rfq" | "po" | "receipt" | "invoice" | "vendor" | "user" | "budget";
const urls: Record<Kind, string> = {
  request: "/purchase-requests",
  rfq: "/rfqs",
  po: "/purchase-orders",
  receipt: "/goods-receipts",
  invoice: "/invoices",
  vendor: "/vendors",
  user: "/admin/users",
  budget: "/budgets",
};
const titles: Record<Kind, string> = {
  request: "Purchase request",
  rfq: "Request for quotation",
  po: "Purchase order",
  receipt: "Goods receipt",
  invoice: "Vendor invoice",
  vendor: "Vendor",
  user: "User account",
  budget: "Budget account",
};
const extraFields: Record<Kind, string[]> = {
  request: ["title", "justification", "neededBy", "estimatedTotal", "departmentId"],
  rfq: ["deadline", "requestId", "officerId"],
  po: ["total", "committed", "expectedAt", "sourcingMode", "vendorId", "requestId"],
  receipt: ["deliveryReference", "receivedAt", "note", "orderId"],
  invoice: ["number", "total", "invoiceDate", "vendorId", "orderId"],
  vendor: ["code", "name", "email", "phone", "address", "taxIdentifier", "active"],
  user: ["name", "email", "role", "active", "departmentId"],
  budget: ["allocated", "committed", "verified", "available", "costCenterId"],
};
function human(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (v) => v.toUpperCase());
}
export function DocumentDetailPage({ kind, id }: { kind: Kind; id: string }) {
  const { data: user } = useAuth();
  const client = useQueryClient();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const path = `${urls[kind]}/${id}`;
  const {
    data,
    refetch,
    isPending,
    error: loadError,
  } = useQuery({ queryKey: ["document", kind, id], queryFn: () => apiGet<EntityRow>(path) });
  const status = String(data?.status || "");
  const actions: {
    label: string;
    command: string;
    roles: string[];
    reason?: boolean;
    to?: string;
  }[] = [];
  if (kind === "request") {
    if (status === "DRAFT" && data?.requesterId === user?.id)
      actions.push({ label: "Submit request", command: "submit", roles: ["ALL"] });
    if (
      status === "SUBMITTED" &&
      ["ADMIN", "DEPARTMENT_MANAGER"].includes(user?.role || "") &&
      data?.requesterId !== user?.id
    ) {
      actions.push(
        { label: "Approve", command: "approve", roles: ["ALL"] },
        { label: "Reject", command: "reject", roles: ["ALL"], reason: true },
      );
    }
  }
  if (kind === "rfq" && ["PROCUREMENT_OFFICER", "ADMIN"].includes(user?.role || "")) {
    if (status === "DRAFT") actions.push({ label: "Open RFQ", command: "open", roles: ["ALL"] });
    if (status === "OPEN")
      actions.push({ label: "Start evaluation", command: "evaluate", roles: ["ALL"] });
    if (status === "EVALUATION")
      actions.push({
        label: "Compare & award",
        command: "compare",
        to: `/app/rfqs/${id}/compare`,
        roles: ["ALL"],
      });
  }
  if (kind === "po" && ["PROCUREMENT_OFFICER", "ADMIN"].includes(user?.role || "")) {
    if (status === "DRAFT") actions.push({ label: "Issue PO", command: "issue", roles: ["ALL"] });
    if (["ISSUED", "PARTIALLY_RECEIVED", "FULLY_RECEIVED"].includes(status))
      actions.push({ label: "Close PO", command: "close", roles: ["ALL"], reason: true });
    if (["DRAFT", "ISSUED"].includes(status))
      actions.push({ label: "Cancel PO", command: "cancel", roles: ["ALL"], reason: true });
  }
  if (kind === "receipt" && ["RECEIVING_OFFICER", "ADMIN"].includes(user?.role || "")) {
    if (status === "DRAFT")
      actions.push({ label: "Post receipt", command: "post", roles: ["ALL"] });
    if (["DRAFT", "POSTED"].includes(status))
      actions.push({ label: "Void receipt", command: "void", roles: ["ALL"], reason: true });
  }
  if (kind === "invoice" && ["FINANCE_OFFICER", "ADMIN"].includes(user?.role || "")) {
    if (["DRAFT", "DISCREPANCY"].includes(status))
      actions.push({
        label: "Submit invoice",
        command: status === "DRAFT" ? "submit" : "resubmit",
        roles: ["ALL"],
      });
    if (["SUBMITTED", "MATCHED", "DISCREPANCY"].includes(status))
      actions.push({
        label: "Three-way matching",
        command: "matching",
        to: `/app/invoices/${id}/matching`,
        roles: ["ALL"],
      });
    if (["DRAFT", "SUBMITTED", "MATCHED", "DISCREPANCY"].includes(status))
      actions.push({ label: "Cancel invoice", command: "cancel", roles: ["ALL"], reason: true });
  }
  async function act(action: string, needsReason: boolean) {
    if (needsReason && reason.trim().length < 5) {
      setError("Provide a reason with at least five characters");
      return;
    }
    if (
      !confirm(
        `Confirm ${action.replaceAll("-", " ")} for ${String(data?.reference || data?.number || id)}?`,
      )
    )
      return;
    setBusy(action);
    setError("");
    try {
      await apiPost(`${path}/${action}`, needsReason ? { reason } : {}, path);
      await client.invalidateQueries({ queryKey: ["document", kind, id] });
      await client.invalidateQueries({ queryKey: ["list"] });
      await client.invalidateQueries({ queryKey: ["dashboard"] });
      await refetch();
      setReason("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Operation failed");
    } finally {
      setBusy("");
    }
  }
  if (isPending)
    return (
      <main className="page">
        <Loading />
      </main>
    );
  if (loadError)
    return (
      <main className="page">
        <ErrorNotice message={loadError.message} />
      </main>
    );
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
                  {/total|price|allocated|committed|verified|available/i.test(field)
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
