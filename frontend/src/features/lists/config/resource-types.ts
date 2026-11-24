export type ResourceKind =
  | "my-requests"
  | "requests"
  | "approvals"
  | "procurement-queue"
  | "rfqs"
  | "purchase-orders"
  | "expected"
  | "receipts"
  | "receiving-history"
  | "invoices"
  | "matching-queue"
  | "discrepancies"
  | "ready"
  | "vendors"
  | "users"
  | "departments"
  | "cost-centers"
  | "categories"
  | "locations"
  | "periods"
  | "policies"
  | "budgets"
  | "audit"
  | "notifications";

export type ResourceConfig = {
  title: string;
  description: string;
  endpoint: string;
  columns: {
    key: string;
    label: string;
    type?: "money" | "date" | "status";
  }[];
  create?: string;
  detail?: string;
  eyebrow: string;
};

export const columns = (...items: ResourceConfig["columns"]) => items;
