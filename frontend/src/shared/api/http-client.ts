export type Problem = {
  code: string;
  detail: string;
  status: number;
  fieldErrors?: unknown;
  requestId?: string;
};
export class HttpProblem extends Error {
  constructor(public readonly problem: Problem) {
    super(problem.detail);
    this.name = "HttpProblem";
  }
}
let csrf: string | null = null;
const etags = new Map<string, string>();
const base = import.meta.env.VITE_API_BASE_URL || "/api/v1";

async function send<T>(
  path: string,
  method: string,
  body?: unknown,
  conditionPath?: string,
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (method !== "GET") {
    if (!csrf) await loadCsrf();
    headers["X-CSRF-Token"] = csrf || "";
    headers["Idempotency-Key"] = crypto.randomUUID();
    if (body !== undefined) headers["Content-Type"] = "application/json";
    const target = conditionPath || path;
    if (etags.has(target)) headers["If-Match"] = etags.get(target)!;
  }
  const res = await fetch(`${base}${path}`, {
    method,
    credentials: "include",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    let p: Problem;
    try {
      p = (await res.json()) as Problem;
    } catch {
      p = { code: "NETWORK_ERROR", detail: `Request failed (${res.status})`, status: res.status };
    }
    throw new HttpProblem({
      code: p.code || "REQUEST_FAILED",
      detail: p.detail || "Unable to complete request",
      status: res.status,
      fieldErrors: p.fieldErrors,
      requestId: p.requestId,
    });
  }
  if (res.headers.get("etag")) etags.set(path, res.headers.get("etag")!);
  const payload = (await res.json()) as {
    data: T;
  };
  return payload.data;
}
export const apiGet = <T>(path: string) => send<T>(path, "GET");
export const apiPost = <T>(path: string, body: unknown = {}, conditionPath?: string) =>
  send<T>(path, "POST", body, conditionPath);
export const apiPatch = <T>(path: string, body: unknown, conditionPath?: string) =>
  send<T>(path, "PATCH", body, conditionPath);
export const apiDelete = <T>(path: string, conditionPath?: string) =>
  send<T>(path, "DELETE", undefined, conditionPath);

export async function loadCsrf() {
  const res = await fetch(`${base}/auth/csrf`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error("Could not establish secure form context");
  const body = (await res.json()) as {
    data: {
      csrfToken: string;
    };
  };
  csrf = body.data.csrfToken;
  return csrf;
}
export async function login(email: string, password: string) {
  await loadCsrf();
  const data = await apiPost<{
    id: string;
    name: string;
    role: string;
  }>("/auth/login", {
    email,
    password,
  });
  await loadCsrf();
  return data;
}
export async function logout() {
  await apiPost("/auth/logout");
  csrf = null;
  etags.clear();
}
export function invalidateSecurityContext() {
  csrf = null;
  etags.clear();
}
export function currentEtag(path: string) {
  return etags.get(path);
}

export async function apiGetCollection<T>(path: string): Promise<{
  data: T[];
  meta?: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}> {
  const res = await fetch(`${base}${path}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    const problem = (await res.json().catch(() => ({
      code: "REQUEST_FAILED",
      detail: "Unable to load records",
      status: res.status,
    }))) as Problem;
    throw new HttpProblem({ ...problem, status: res.status });
  }
  return res.json();
}
