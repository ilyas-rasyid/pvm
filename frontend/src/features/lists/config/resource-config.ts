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
const columns = (...items: ResourceConfig["columns"]) => items;
export const configs: Record<ResourceKind, ResourceConfig> = {
  "my-requests": {
    title: "My purchase requests",
    description: "Track the requests you created and their approval progress.",
    eyebrow: "PURCHASING",
    endpoint: "/my/purchase-requests",
    create: "/app/requests/new",
    detail: "/app/requests",
    columns: columns(
      { key: "reference", label: "Reference" },
      { key: "title", label: "Request" },
      { key: "estimatedTotal", label: "Estimated total", type: "money" },
      { key: "status", label: "Status", type: "status" },
      { key: "createdAt", label: "Created", type: "date" },
    ),
  },
  requests: {
    title: "Purchase requests",
    description: "Department and procurement request records.",
    eyebrow: "PURCHASING",
    endpoint: "/purchase-requests",
    create: "/app/requests/new",
    detail: "/app/requests",
    columns: columns(
      { key: "reference", label: "Reference" },
      { key: "title", label: "Request" },
      { key: "estimatedTotal", label: "Estimated", type: "money" },
      { key: "status", label: "Status", type: "status" },
    ),
  },
  approvals: {
    title: "Approval queue",
    description: "Review submitted requests from your assigned department.",
    eyebrow: "MANAGEMENT",
    endpoint: "/approvals/queue",
    detail: "/app/requests",
    columns: columns(
      { key: "reference", label: "Reference" },
      { key: "title", label: "Request" },
      { key: "estimatedTotal", label: "Estimated total", type: "money" },
      { key: "submittedAt", label: "Submitted", type: "date" },
    ),
  },
  "procurement-queue": {
    title: "Procurement queue",
    description: "Approved requests awaiting sourcing and purchase order creation.",
    eyebrow: "SOURCING",
    endpoint: "/procurement/queue",
    detail: "/app/requests",
    columns: columns(
      { key: "reference", label: "Reference" },
      { key: "title", label: "Request" },
      { key: "estimatedTotal", label: "Estimated", type: "money" },
      { key: "approvedAt", label: "Approved", type: "date" },
    ),
  },
  rfqs: {
    title: "RFQs & quotations",
    description: "Collect offers, compare vendors, and record awards.",
    eyebrow: "SOURCING",
    endpoint: "/rfqs",
    create: "/app/rfqs/new",
    detail: "/app/rfqs",
    columns: columns(
      { key: "reference", label: "RFQ" },
      { key: "request.reference", label: "Source PR" },
      { key: "status", label: "Status", type: "status" },
      { key: "deadline", label: "Deadline", type: "date" },
    ),
  },
  "purchase-orders": {
    title: "Purchase orders",
    description: "Track committed purchases, deliveries, and invoices.",
    eyebrow: "ORDERS",
    endpoint: "/purchase-orders",
    create: "/app/purchase-orders/new",
    detail: "/app/purchase-orders",
    columns: columns(
      { key: "reference", label: "PO" },
      { key: "vendor.name", label: "Vendor" },
      { key: "total", label: "Value", type: "money" },
      { key: "status", label: "Status", type: "status" },
      { key: "expectedAt", label: "Expected", type: "date" },
    ),
  },
  expected: {
    title: "Expected deliveries",
    description: "Orders available for goods receiving.",
    eyebrow: "RECEIVING",
    endpoint: "/receiving/expected",
    create: "/app/receipts/new",
    detail: "/app/purchase-orders",
    columns: columns(
      { key: "reference", label: "PO" },
      { key: "vendor.name", label: "Vendor" },
      { key: "status", label: "Status", type: "status" },
      { key: "expectedAt", label: "Expected", type: "date" },
    ),
  },
  receipts: {
    title: "Goods receipts",
    description: "Evidence of deliveries accepted and rejected.",
    eyebrow: "RECEIVING",
    endpoint: "/goods-receipts",
    create: "/app/receipts/new",
    detail: "/app/receipts",
    columns: columns(
      { key: "reference", label: "Receipt" },
      { key: "order.reference", label: "PO" },
      { key: "status", label: "Status", type: "status" },
      { key: "receivedAt", label: "Received", type: "date" },
    ),
  },
  "receiving-history": {
    title: "Receiving history",
    description: "Posted receipt history.",
    eyebrow: "RECEIVING",
    endpoint: "/receiving/history",
    detail: "/app/receipts",
    columns: columns(
      { key: "reference", label: "Receipt" },
      { key: "status", label: "Status", type: "status" },
      { key: "postedAt", label: "Posted", type: "date" },
    ),
  },
  invoices: {
    title: "Vendor invoices",
    description: "Review vendor bills and verification progress.",
    eyebrow: "FINANCE",
    endpoint: "/invoices",
    create: "/app/invoices/new",
    detail: "/app/invoices",
    columns: columns(
      { key: "number", label: "Invoice" },
      { key: "vendor.name", label: "Vendor" },
      { key: "order.reference", label: "PO" },
      { key: "total", label: "Total", type: "money" },
      { key: "status", label: "Status", type: "status" },
    ),
  },
  "matching-queue": {
    title: "Matching queue",
    description: "Invoices requiring matching or final verification.",
    eyebrow: "FINANCE",
    endpoint: "/finance/matching-queue",
    detail: "/app/invoices",
    columns: columns(
      { key: "number", label: "Invoice" },
      { key: "vendor.name", label: "Vendor" },
      { key: "total", label: "Value", type: "money" },
      { key: "status", label: "Status", type: "status" },
    ),
  },
  discrepancies: {
    title: "Invoice discrepancies",
    description: "Find differences before final verification.",
    eyebrow: "FINANCE",
    endpoint: "/finance/discrepancies",
    detail: "/app/invoices",
    columns: columns(
      { key: "number", label: "Invoice" },
      { key: "vendor.name", label: "Vendor" },
      { key: "total", label: "Value", type: "money" },
      { key: "status", label: "Status", type: "status" },
    ),
  },
  ready: {
    title: "Ready for payment",
    description: "Verified invoices. Payment execution occurs outside PVMS.",
    eyebrow: "FINANCE",
    endpoint: "/finance/ready-for-payment",
    detail: "/app/invoices",
    columns: columns(
      { key: "number", label: "Invoice" },
      { key: "vendor.name", label: "Vendor" },
      { key: "total", label: "Verified amount", type: "money" },
      { key: "readyAt", label: "Verified on", type: "date" },
    ),
  },
  vendors: {
    title: "Vendor directory",
    description: "Maintain approved suppliers and their contact details.",
    eyebrow: "MASTER DATA",
    endpoint: "/vendors",
    create: "/app/vendors/new",
    detail: "/app/vendors",
    columns: columns(
      { key: "code", label: "Vendor code" },
      { key: "name", label: "Legal name" },
      { key: "email", label: "Email" },
      { key: "active", label: "Active" },
    ),
  },
  users: {
    title: "Users & roles",
    description: "Manage account access and organization roles.",
    eyebrow: "ADMINISTRATION",
    endpoint: "/admin/users",
    create: "/app/admin/users/new",
    detail: "/app/admin/users",
    columns: columns(
      { key: "name", label: "Name" },
      { key: "email", label: "Work email" },
      { key: "role", label: "Role" },
      { key: "active", label: "Active" },
    ),
  },
  departments: {
    title: "Departments",
    description: "Manage departmental structure and managers.",
    eyebrow: "ADMINISTRATION",
    endpoint: "/admin/departments",
    create: "/app/admin/departments/new",
    columns: columns(
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "active", label: "Active" },
    ),
  },
  "cost-centers": {
    title: "Cost centers",
    description: "Allocate procurement expenses by business unit.",
    eyebrow: "ADMINISTRATION",
    endpoint: "/admin/cost-centers",
    create: "/app/admin/cost-centers/new",
    columns: columns(
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "department.name", label: "Department" },
    ),
  },
  categories: {
    title: "Item categories",
    description: "Group requested goods consistently.",
    eyebrow: "ADMINISTRATION",
    endpoint: "/admin/item-categories",
    create: "/app/admin/categories/new",
    columns: columns({ key: "code", label: "Code" }, { key: "name", label: "Name" }),
  },
  locations: {
    title: "Delivery locations",
    description: "Addresses for goods receiving.",
    eyebrow: "ADMINISTRATION",
    endpoint: "/admin/delivery-locations",
    create: "/app/admin/locations/new",
    columns: columns(
      { key: "code", label: "Code" },
      { key: "name", label: "Name" },
      { key: "address", label: "Address" },
    ),
  },
  periods: {
    title: "Fiscal periods",
    description: "Define budget windows and their status.",
    eyebrow: "ADMINISTRATION",
    endpoint: "/admin/fiscal-periods",
    create: "/app/admin/periods/new",
    columns: columns(
      { key: "code", label: "Code" },
      { key: "startDate", label: "Start", type: "date" },
      { key: "endDate", label: "End", type: "date" },
      { key: "status", label: "Status", type: "status" },
    ),
  },
  policies: {
    title: "Procurement policies",
    description: "Review direct purchase settings and effective versions.",
    eyebrow: "ADMINISTRATION",
    endpoint: "/admin/procurement-policies",
    create: "/app/admin/policies/new",
    columns: columns(
      { key: "version", label: "Version" },
      { key: "directPurchaseThreshold", label: "Direct purchase cap", type: "money" },
      { key: "effectiveFrom", label: "Effective", type: "date" },
    ),
  },
  budgets: {
    title: "Budget overview",
    description: "Allocated, committed, verified and available funds by cost center.",
    eyebrow: "FINANCIAL CONTROL",
    endpoint: "/budgets",
    create: "/app/admin/budgets/new",
    detail: "/app/budgets",
    columns: columns(
      { key: "costCenter.name", label: "Cost center" },
      { key: "allocated", label: "Allocated", type: "money" },
      { key: "committed", label: "Committed", type: "money" },
      { key: "verified", label: "Verified", type: "money" },
      { key: "available", label: "Available", type: "money" },
    ),
  },
  audit: {
    title: "Audit history",
    description: "Read-only record of significant actions.",
    eyebrow: "ADMINISTRATION",
    endpoint: "/admin/audit-logs",
    columns: columns(
      { key: "action", label: "Action" },
      { key: "resourceType", label: "Resource" },
      { key: "resourceId", label: "Record ID" },
      { key: "createdAt", label: "Occurred", type: "date" },
    ),
  },
  notifications: {
    title: "Notifications",
    description: "Recent operational events requiring attention.",
    eyebrow: "WORKSPACE",
    endpoint: "/notifications/",
    columns: columns(
      { key: "title", label: "Event" },
      { key: "message", label: "Details" },
      { key: "createdAt", label: "Time", type: "date" },
    ),
  },
};
