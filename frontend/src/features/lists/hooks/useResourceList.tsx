import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { resourceListApi } from "../services/resource-list.api";
import { StatusBadge } from "../../../shared/ui/StatusBadge";
import { rupiah, dateText, cellText } from "../../../shared/formatters/value";
import { configs, type ResourceKind } from "../config/resource-config";

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
  if (type === "status") {
    return <StatusBadge status={String(value || "UNKNOWN")} />;
  }
  if (type === "money") {
    return <span style={{ fontVariantNumeric: "tabular-nums" }}>{rupiah(value)}</span>;
  }
  if (type === "date") {
    return dateText(value);
  }
  if (typeof value === "boolean") {
    return <StatusBadge status={value ? "ACTIVE" : "INACTIVE"} />;
  }
  return cellText(value);
} export function useResourceList({ kind }: { kind: ResourceKind }) {
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
    if (debounced) {
      url.searchParams.set("search", debounced);
    }
    else {
      url.searchParams.delete("search");
    }
    if (status) {
      url.searchParams.set("status", status);
    }
    else {
      url.searchParams.delete("status");
    }
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
    queryFn: () => resourceListApi.list(endpoint),
    staleTime: 20000,
  });
  const rows = data?.data || [];
  const meta = data?.meta || {
    page: 1,
    pageSize: rows.length,
    totalItems: rows.length,
    totalPages: 1,
  };
  return {
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
  };
}
