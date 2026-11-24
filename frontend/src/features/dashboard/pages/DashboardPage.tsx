import { Link } from "@tanstack/react-router";

import { ArrowUpRight, Plus, ArrowRight, ClipboardCheck } from "lucide-react";

import { PageHeader } from "../../../shared/ui/PageHeader";
import { Loading, ErrorNotice } from "../../../shared/ui/Feedback";

const config: Record<
  string,
  {
    intro: string;
    action: string;
    to: string;
    queue: string;
  }
> = {
  EMPLOYEE: {
    intro: "Track the requests you submitted and continue your draft work.",
    action: "New purchase request",
    to: "/app/requests/new",
    queue: "/app/my-requests",
  },
  DEPARTMENT_MANAGER: {
    intro: "Review department requests and keep approvals moving.",
    action: "Review approvals",
    to: "/app/approvals",
    queue: "/app/approvals",
  },
  PROCUREMENT_OFFICER: {
    intro: "Turn approved requests into well-controlled purchase orders.",
    action: "Procurement queue",
    to: "/app/procurement/queue",
    queue: "/app/rfqs",
  },
  RECEIVING_OFFICER: {
    intro: "Record delivered goods and reconcile remaining quantities.",
    action: "Expected deliveries",
    to: "/app/receiving/expected",
    queue: "/app/receipts",
  },
  FINANCE_OFFICER: {
    intro: "Match vendor invoices against orders and accepted receipts.",
    action: "Matching queue",
    to: "/app/finance/matching-queue",
    queue: "/app/finance/discrepancies",
  },
  ADMIN: {
    intro: "Maintain identity, master records, policies and system oversight.",
    action: "Manage users",
    to: "/app/admin/users",
    queue: "/app/admin/audit",
  },
};
import { useDashboard } from "../hooks/useDashboard";

export function DashboardPage() {
  const {
    user,
    role,
    conf,
    data,
    isPending,
    error,
  } = useDashboard();
  return (
    <main className="page">
      <PageHeader
        eyebrow="WORKSPACE OVERVIEW"
        title={`Good day, ${user?.name?.split(" ")[0] || "there"}`}
        description={conf.intro}
        actions={
          <Link
            className="button primary"
            to={conf.to as "/app"}
          >
            <Plus size={15} />
            {conf.action}
          </Link>
        }
      />
      {isPending ? (
        <Loading />
      ) : error ? (
        <ErrorNotice message={error.message} />
      ) : (
        <div className="grid-kpis">
          {Object.entries(data || {}).map(([key, value]) => (
            <div
              className="card kpi"
              key={key}
            >
              <div className="kpi-title">
                {key
                  .replace(/([a-z])([A-Z])/g, "$1 $2")
                  .replaceAll("_", " ")
                  .replace(/^./, (v) => v.toUpperCase())}
              </div>
              <div className="kpi-value">{value.toLocaleString("id-ID")}</div>
              <div className="kpi-note">Actual records · Live database</div>
            </div>
          ))}
        </div>
      )}
      <div className="two-pane">
        <section className="card">
          <div className="section-header">
            <h2 className="card-title">Your next step</h2>
            <ArrowUpRight size={17} />
          </div>
          <div className="card-pad">
            <h3 style={{ fontSize: 16, margin: "0 0 8px" }}>{conf.action}</h3>
            <p
              className="muted"
              style={{ lineHeight: 1.6, margin: "0 0 18px" }}
            >
              {conf.intro}
            </p>
            <Link
              className="button"
              to={conf.to as "/app"}
            >
              Open workspace <ArrowRight size={15} />
            </Link>
          </div>
        </section>
        <section className="card">
          <div className="section-header">
            <h2 className="card-title">Operational workspace</h2>
            <ClipboardCheck size={17} />
          </div>
          <div className="card-pad">
            <p
              className="muted"
              style={{ lineHeight: 1.6 }}
            >
              Open your work queue to review actual documents, current states and required actions.
            </p>
            <Link
              className="button"
              to={conf.queue as "/app"}
            >
              View work queue <ArrowRight size={15} />
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
