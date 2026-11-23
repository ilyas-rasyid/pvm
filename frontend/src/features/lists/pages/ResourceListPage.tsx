import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Plus, Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { apiGetCollection } from "../../../shared/api/http-client";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { StatusBadge } from "../../../shared/ui/StatusBadge";
import { ErrorNotice, Loading, Empty } from "../../../shared/ui/Feedback";
import { rupiah, dateText, cellText } from "../../../shared/formatters/value";
import { configs, type ResourceKind } from "../config/resource-config";
import type { EntityRow } from "../../../shared/types/models";

function nested(obj: Record<string, unknown>, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, key) =>
        typeof acc === "object" && acc !== null ? (acc as Record<string, unknown>)[key] : undefined,
      obj,
    );
}
function printable(value: unknown, type?: "money" | "date" | "status") {
  if (type === "status") return <StatusBadge status={String(value || "UNKNOWN")} />;
  if (type === "money")
    return <span style={{ fontVariantNumeric: "tabular-nums" }}>{rupiah(value)}</span>;
  if (type === "date") return dateText(value);
  if (typeof value === "boolean") return <StatusBadge status={value ? "ACTIVE" : "INACTIVE"} />;
  return cellText(value);
}
export function ResourceListPage({ kind }: { kind: ResourceKind }) {
  const config = configs[kind];
  const params = new URLSearchParams(location.search);
  const [page, setPage] = useState(Number(params.get("page")) || 1);
  const [search, setSearch] = useState(params.get("search") || "");
  const [debounced, setDebounced] = useState(search);
  const [status, setStatus] = useState(params.get("status") || "");
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const url = new URL(location.href);
    url.searchParams.set("page", String(page));
    if (debounced) url.searchParams.set("search", debounced);
    else url.searchParams.delete("search");
    if (status) url.searchParams.set("status", status);
    else url.searchParams.delete("status");
    history.replaceState(history.state, "", url);
  }, [page, debounced, status]);
  const query = useMemo(
    () =>
      new URLSearchParams({
        page: String(page),
        pageSize: "20",
        ...(debounced ? { search: debounced } : {}),
        ...(status ? { status } : {}),
      }).toString(),
    [page, debounced, status],
  );
  const endpoint = `${config.endpoint}${config.endpoint.includes("?") ? "&" : "?"}${query}`;
  const { data, isPending, error, refetch, isFetching } = useQuery({
    queryKey: ["list", kind, query],
    queryFn: () => apiGetCollection<EntityRow>(endpoint),
    staleTime: 20000,
  });
  const rows = data?.data || [];
  const meta = data?.meta || {
    page: 1,
    pageSize: rows.length,
    totalItems: rows.length,
    totalPages: 1,
  };
  return (
    <main className="page">
      <PageHeader
        eyebrow={config.eyebrow}
        title={config.title}
        description={config.description}
        actions={
          config.create ? (
            <Link
              className="button primary"
              to={config.create as "/app"}
            >
              <Plus size={15} />
              New record
            </Link>
          ) : undefined
        }
      />
      <div className="card">
        <div className="table-toolbar">
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
            <Search
              size={16}
              style={{ position: "absolute", left: 11, top: 10, color: "#94a3b8" }}
            />
            <input
              className="input"
              style={{ paddingLeft: 35 }}
              placeholder="Search records"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              aria-label="Search records"
            />
          </div>
          <select
            className="input"
            style={{ width: 170 }}
            value={status}
            aria-label="Filter status"
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            {[
              "DRAFT",
              "SUBMITTED",
              "APPROVED",
              "OPEN",
              "ISSUED",
              "PARTIALLY_RECEIVED",
              "FULLY_RECEIVED",
              "MATCHED",
              "DISCREPANCY",
              "READY_FOR_PAYMENT",
              "CLOSED",
              "CANCELLED",
            ].map((v) => (
              <option
                value={v}
                key={v}
              >
                {v.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <button
            className="button"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
        {isPending ? (
          <Loading />
        ) : error ? (
          <div className="card-pad">
            <ErrorNotice message={error.message} />
          </div>
        ) : rows.length === 0 ? (
          <Empty />
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {config.columns.map((col) => (
                    <th key={col.key}>{col.label}</th>
                  ))}
                  {config.detail && <th> </th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    {config.columns.map((col, i) => (
                      <td key={col.key}>
                        {i === 0 && config.detail ? (
                          <Link
                            className="text-link"
                            to={`${config.detail}/${row.id}` as "/app"}
                          >
                            {printable(nested(row, col.key), col.type)}
                          </Link>
                        ) : (
                          printable(nested(row, col.key), col.type)
                        )}
                      </td>
                    ))}
                    {config.detail && (
                      <td>
                        <Link
                          className="button small-btn"
                          to={`${config.detail}/${row.id}` as "/app"}
                        >
                          View
                        </Link>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="table-footer">
          <span>{meta?.totalItems ?? 0} records</span>
          <div className="inline-list">
            <button
              className="icon-button"
              disabled={page <= 1}
              onClick={() => setPage((x) => Math.max(1, x - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft size={17} />
            </button>
            <span>
              Page {page} / {meta?.totalPages || 1}
            </span>
            <button
              className="icon-button"
              disabled={page >= (meta?.totalPages || 1)}
              onClick={() => setPage((x) => x + 1)}
              aria-label="Next page"
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
