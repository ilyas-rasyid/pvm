import { createHash } from "node:crypto";

export const BASE_URL = process.env.API_URL || "http://localhost:3001/api/v1";
export const APP_ORIGIN = process.env.APP_ORIGIN || "http://localhost:5173";
export const DEMO_PASSWORD = process.env.DEMO_PASSWORD || "DemoPassword_PVMS2026!";

export interface TestClient {
  email: string;
  role: string;
  sidCookie: string;
  sessionCsrf: string;
  etags: Map<string, string>;
  get<T = any>(path: string): Promise<T>;
  post<T = any>(
    path: string,
    body?: any,
    conditionPath?: string,
    idempotencyKey?: string,
  ): Promise<T>;
  patch<T = any>(path: string, body?: any, conditionPath?: string): Promise<T>;
  del<T = any>(path: string, conditionPath?: string): Promise<T>;
}

export async function createTestClient(
  email: string,
  password = DEMO_PASSWORD,
): Promise<TestClient> {
  const csrfRes = await fetch(`${BASE_URL}/auth/csrf`);
  const preCookie = csrfRes.headers.get("set-cookie")?.split(";")[0] || "";
  const {
    data: { csrfToken: preCsrf },
  } = (await csrfRes.json()) as any;

  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      Origin: APP_ORIGIN,
      "Content-Type": "application/json",
      "X-CSRF-Token": preCsrf,
      Cookie: preCookie,
    },
    body: JSON.stringify({ email, password }),
  });

  if (!loginRes.ok) {
    throw new Error(`Login failed for ${email} (${loginRes.status}): ${await loginRes.text()}`);
  }

  const sidCookie = loginRes.headers.get("set-cookie")?.split(";")[0] || "";
  const loginJson = (await loginRes.json()) as any;
  const role = loginJson.data.role;

  let sessionCsrf = "";
  async function refreshCsrf() {
    const res = await fetch(`${BASE_URL}/auth/csrf`, { headers: { Cookie: sidCookie } });
    const json = (await res.json()) as any;
    sessionCsrf = json.data.csrfToken;
  }
  await refreshCsrf();

  const etags = new Map<string, string>();

  async function request<T>(
    method: string,
    path: string,
    body?: any,
    conditionPath?: string,
    customKey?: string,
  ): Promise<T> {
    await refreshCsrf();
    const headers: Record<string, string> = {
      Origin: APP_ORIGIN,
      "X-CSRF-Token": sessionCsrf,
      Cookie: sidCookie,
      Accept: "application/json",
      "Idempotency-Key": customKey || crypto.randomUUID(),
    };
    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const match = conditionPath ? etags.get(conditionPath) : etags.get(path);
    if (match) {
      headers["If-Match"] = match;
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const etag = res.headers.get("etag");
    if (etag) {
      etags.set(path, etag);
    }

    if (!res.ok) {
      const text = await res.text();
      let errObj: any;
      try {
        errObj = JSON.parse(text);
      } catch {
        errObj = { detail: text };
      }
      const err = new Error(errObj.detail || `Request ${method} ${path} failed (${res.status})`);
      (err as any).status = res.status;
      (err as any).code = errObj.code;
      (err as any).response = errObj;
      throw err;
    }

    const json = (await res.json()) as any;
    return json.data !== undefined ? json.data : json;
  }

  return {
    email,
    role,
    sidCookie,
    sessionCsrf,
    etags,
    get: <T = any>(path: string) => request<T>("GET", path),
    post: <T = any>(path: string, body?: any, conditionPath?: string, key?: string) =>
      request<T>("POST", path, body, conditionPath, key),
    patch: <T = any>(path: string, body?: any, conditionPath?: string) =>
      request<T>("PATCH", path, body, conditionPath),
    del: <T = any>(path: string, conditionPath?: string) =>
      request<T>("DELETE", path, undefined, conditionPath),
  };
}
