export type RouteContext = {
  request: Request;
  params?: Record<string, string | undefined>;
  body?: unknown;
  set: {
    status?: number | string;
    headers: Record<string, string | number | undefined>;
  };
  [key: string]: unknown;
};

export type Actor = {
  id: string;
  name: string;
  email: string;
  role: string;
  departmentId: string | null;
  sessionId: string;
};

export function input<T>(
  ctx: RouteContext,
  schema: {
    parse(value: unknown): T;
  },
): T {
  return schema.parse(ctx.body);
}

export function pageParams(request: Request) {
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page") || 1) || 1);
  const pageSize = [20, 50, 100].includes(Number(url.searchParams.get("pageSize")))
    ? Number(url.searchParams.get("pageSize"))
    : 20;
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
    page,
    pageSize,
    search: (url.searchParams.get("search") || "").slice(0, 120),
    status: url.searchParams.get("status") || undefined,
  };
}

export function collection<T>(data: T[], totalItems: number, page: number, pageSize: number) {
  return {
    data,
    meta: { page, pageSize, totalItems, totalPages: Math.ceil(totalItems / pageSize) },
  };
}
export function response<T>(data: T) {
  return { data };
}
