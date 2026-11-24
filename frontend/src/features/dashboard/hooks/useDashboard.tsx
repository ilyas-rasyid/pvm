import { useQuery } from "@tanstack/react-query";

import { dashboardApi } from "../services/dashboard.api";
import { useAuth } from "../../auth/hooks/useAuth";

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
export function useDashboard() {
  const { data: user } = useAuth();
  const role = user?.role || "EMPLOYEE";
  const conf = config[role];
  const { data, isPending, error } = useQuery({
    queryKey: ["dashboard", role],
    queryFn: () => dashboardApi.summary(),
  });
  return {
    user,
    role,
    conf,
    data,
    isPending,
    error,
  };
}
