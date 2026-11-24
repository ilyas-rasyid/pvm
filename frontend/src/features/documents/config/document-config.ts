export type Kind = "request" | "rfq" | "po" | "receipt" | "invoice" | "vendor" | "user" | "budget";
export const urls: Record<Kind, string> = {
  request: "/purchase-requests",
  rfq: "/rfqs",
  po: "/purchase-orders",
  receipt: "/goods-receipts",
  invoice: "/invoices",
  vendor: "/vendors",
  user: "/admin/users",
  budget: "/budgets",
};
export const titles: Record<Kind, string> = {
  request: "Purchase request",
  rfq: "Request for quotation",
  po: "Purchase order",
  receipt: "Goods receipt",
  invoice: "Vendor invoice",
  vendor: "Vendor",
  user: "User account",
  budget: "Budget account",
};
export const extraFields: Record<Kind, string[]> = {
  request: ["title", "justification", "neededBy", "estimatedTotal", "departmentId"],
  rfq: ["deadline", "requestId", "officerId"],
  po: ["total", "committed", "expectedAt", "sourcingMode", "vendorId", "requestId"],
  receipt: ["deliveryReference", "receivedAt", "note", "orderId"],
  invoice: ["number", "total", "invoiceDate", "vendorId", "orderId"],
  vendor: ["code", "name", "email", "phone", "address", "taxIdentifier", "active"],
  user: ["name", "email", "role", "active", "departmentId"],
  budget: ["allocated", "committed", "verified", "available", "costCenterId"],
};
export function human(key: string) {
  if (key === "departmentId") return "Department";
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (v) => v.toUpperCase());
}
