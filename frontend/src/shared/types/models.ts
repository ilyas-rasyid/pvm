export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  departmentId: string | null;
  department?: string | { id: string; name: string; code?: string } | null;
  departmentName?: string | null;
  departmentCode?: string | null;
  mustChangePassword?: boolean;
};
export type Paginated<T> = {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
};
export type RecordValue =
  string | number | boolean | null | undefined | Record<string, unknown> | unknown[];
export type EntityRow = {
  id: string;
  reference?: string;
  status?: string;
  version?: number;
  name?: string;
  title?: string;
  code?: string;
  [key: string]: unknown;
};
export type RequestLine = {
  id: string;
  description: string;
  quantity: number;
  approvedQty: number;
  awardedQty: number;
  issuedQty: number;
  estimatedPrice: string;
};
export type PurchaseRequest = EntityRow & {
  requesterId: string;
  departmentId: string;
  costCenterId: string;
  lines: RequestLine[];
};
export type PoLine = {
  id: string;
  description: string;
  quantity: number;
  acceptedQty: number;
  invoicedQty: number;
  price: string;
  taxRate: string;
  total: string;
  requestLineId: string;
};
export type Order = EntityRow & {
  vendorId: string;
  requestId: string;
  fiscalPeriodId: string;
  costCenterId: string;
  lines: PoLine[];
  total: string;
  committed: string;
};
export type ReceiptLine = {
  id: string;
  orderLineId: string;
  deliveredQty: number;
  acceptedQty: number;
  rejectedQty: number;
};
export type InvoiceLine = {
  id: string;
  orderLineId: string;
  quantity: number;
  price: string;
  taxRate: string;
  total: string;
  allocations?: unknown[];
};
export type Invoice = EntityRow & {
  number: string;
  vendorId: string;
  orderId: string;
  total: string;
  lines: InvoiceLine[];
  order: Order;
  matches: unknown[];
};
