
import { Download, BarChart3 } from "lucide-react";

import { PageHeader } from "../../../shared/ui/PageHeader";
import { ErrorNotice, Loading, Empty } from "../../../shared/ui/Feedback";
import { cellText } from "../../../shared/formatters/value";

const kinds = ["purchase-requests", "procurement", "receiving", "invoices", "vendors", "budgets"];
import { useReports } from "../hooks/useReports";

export function ReportsPage() {
  const {
    kind,
    setKind,
    report,
    rows,
    cols,
    download,
  } = useReports();
  return (
    <main className="page">
      <PageHeader
        eyebrow="BUSINESS INTELLIGENCE"
        title="Reports"
        description="Operational records from the live database. Verified invoiced amounts are not payments."
        actions={
          <button
            className="button"
            onClick={download}
          >
            <Download size={15} />
            Export CSV
          </button>
        }
      />
      <section className="card">
        <div className="table-toolbar">
          <BarChart3 size={17} />
          <select
            className="input"
            style={{ width: 250 }}
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            aria-label="Select report"
          >
            {kinds.map((x) => (
              <option
                key={x}
                value={x}
              >
                {x.replaceAll("-", " ")}
              </option>
            ))}
          </select>
        </div>
        {report.isPending ? (
          <Loading />
        ) : report.error ? (
          <div className="card-pad">
            <ErrorNotice message={report.error.message} />
          </div>
        ) : rows.length === 0 ? (
          <Empty />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {cols.map((c) => (
                    <th key={c}>{c.replace(/([A-Z])/g, " $1")}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 100).map((r, i) => (
                  <tr key={i}>
                    {cols.map((c) => (
                      <td key={c}>{cellText(r[c])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="table-footer">
          Showing {Math.min(rows.length, 100)} of {rows.length} rows in this response.
        </div>
      </section>
    </main>
  );
}
