import { Link } from "@tanstack/react-router";
import { Plus, Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

import { useResourceList } from "../hooks/useResourceList";
import { ResourceRecordsTable } from "../components/ResourceRecordsTable";
import { PageHeader } from "../../../shared/ui/PageHeader";
import { ErrorNotice, Loading, Empty } from "../../../shared/ui/Feedback";
import { type ResourceKind } from "../config/resource-config";

export function ResourceListPage({ kind }: { kind: ResourceKind }) {
  const {
    config,
    params,
    page,
    setPage,
    search,
    setSearch,
    debounced,
    setDebounced,
    status,
    setStatus,
    query,
    endpoint,
    data,
    isPending,
    error,
    refetch,
    isFetching,
    rows,
    meta,
  } = useResourceList({ kind });
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
            <ResourceRecordsTable
              rows={rows}
              config={config}
            />
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
