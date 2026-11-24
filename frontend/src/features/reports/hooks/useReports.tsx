import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { reportsApi } from "../services/reports.api";

const kinds = ["purchase-requests", "procurement", "receiving", "invoices", "vendors", "budgets"];
export function useReports() {
  const [kind, setKind] = useState("procurement");
  const report = useQuery({
    queryKey: ["report", kind],
    queryFn: () => reportsApi.getReport(kind),
  });
  const rows = report.data || [];
  const cols = rows.length
    ? Object.keys(rows[0]).filter((k) => !k.endsWith("Id") && !k.includes("Hash"))
    : [];
  async function download() {
    try {
      const res = await fetch(`/api/v1/reports/${kind}/export`, { credentials: "include" });
      if (!res.ok) {
        throw new Error("Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pvms-${kind}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Unable to export");
    }
  }
  return {
    kind,
    setKind,
    report,
    rows,
    cols,
    download,
  };
}
