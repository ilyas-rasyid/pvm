import { test, expect, describe } from "bun:test";
import { createTestClient, BASE_URL, APP_ORIGIN } from "./test-client";

describe("Role-Based Authorization & Security Boundaries", () => {
  test("Employee cannot approve a Purchase Request", async () => {
    const emp = await createTestClient("employee@pvms.demo");
    const depts = await emp.get("/reference/departments");
    const centers = await emp.get("/admin/cost-centers");

    const pr = await emp.post("/purchase-requests", {
      title: "Employee Unauthorized Approval Test",
      departmentId: depts[0].id,
      costCenterId: centers[0].id,
      neededBy: "2026-12-31",
      justification: "Testing permission boundaries",
      lines: [
        { description: "Office Supplies", quantity: 1, estimatedPrice: "100000.00", unit: "UNIT" },
      ],
    });

    await emp.get(`/purchase-requests/${pr.id}`);
    await emp.post(`/purchase-requests/${pr.id}/submit`, {}, `/purchase-requests/${pr.id}`);

    // Refresh ETag after state transition
    await emp.get(`/purchase-requests/${pr.id}`);

    // Attempt approval as employee
    let error: any;
    try {
      await emp.post(`/purchase-requests/${pr.id}/approve`, {}, `/purchase-requests/${pr.id}`);
    } catch (e) {
      error = e;
    }
    expect(error).toBeDefined();
    expect(error.status).toBe(403);
  });

  test("Department Manager cannot approve own Purchase Request (Self-Approval Forbidden)", async () => {
    const mgr = await createTestClient("department-manager@pvms.demo");
    const depts = await mgr.get("/reference/departments");
    const centers = await mgr.get("/admin/cost-centers");

    const pr = await mgr.post("/purchase-requests", {
      title: "Manager Self-Request Approval Test",
      departmentId: depts[0].id,
      costCenterId: centers[0].id,
      neededBy: "2026-12-31",
      justification: "Testing self-approval restriction",
      lines: [
        {
          description: "Department Tablet",
          quantity: 1,
          estimatedPrice: "5000000.00",
          unit: "UNIT",
        },
      ],
    });

    await mgr.get(`/purchase-requests/${pr.id}`);
    await mgr.post(`/purchase-requests/${pr.id}/submit`, {}, `/purchase-requests/${pr.id}`);

    // Refresh ETag after state transition
    await mgr.get(`/purchase-requests/${pr.id}`);

    // Manager attempts to approve own request
    let error: any;
    try {
      await mgr.post(`/purchase-requests/${pr.id}/approve`, {}, `/purchase-requests/${pr.id}`);
    } catch (e) {
      error = e;
    }
    expect(error).toBeDefined();
    expect(error.status).toBe(403);
    expect(error.code).toBe("SELF_APPROVAL_FORBIDDEN");
  });

  test("Receiving Officer cannot access invoice creation or financial verification", async () => {
    const rec = await createTestClient("receiving-officer@pvms.demo");
    let error: any;
    try {
      await rec.post("/invoices", {
        orderId: "00000000-0000-0000-0000-000000000000",
        vendorId: "00000000-0000-0000-0000-000000000000",
        number: "INV-HACK-001",
        invoiceDate: "2026-11-23",
        lines: [],
      });
    } catch (e) {
      error = e;
    }
    expect(error).toBeDefined();
    expect(error.status).toBe(403);
  });

  test("Origin guard strictly rejects disallowed origin header", async () => {
    const csrfRes = await fetch(`${BASE_URL}/auth/csrf`);
    const preCookie = csrfRes.headers.get("set-cookie")?.split(";")[0] || "";
    const {
      data: { csrfToken },
    } = (await csrfRes.json()) as any;

    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: "POST",
      headers: {
        Origin: "https://malicious-site.example.com",
        "Content-Type": "application/json",
        "X-CSRF-Token": csrfToken,
        Cookie: preCookie,
      },
      body: JSON.stringify({ email: "admin@pvms.demo", password: "DemoPassword_PVMS2026!" }),
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as any;
    expect(body.code).toBe("ORIGIN_NOT_ALLOWED");
  });

  test("CSRF guard strictly rejects requests with invalid or tampered CSRF tokens", async () => {
    const emp = await createTestClient("employee@pvms.demo");
    const depts = await emp.get("/reference/departments");
    const centers = await emp.get("/admin/cost-centers");

    const res = await fetch(`${BASE_URL}/purchase-requests`, {
      method: "POST",
      headers: {
        Origin: APP_ORIGIN,
        "X-CSRF-Token": "tampered_fake_csrf_token_12345",
        Cookie: emp.sidCookie,
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        title: "Forged CSRF Attempt",
        departmentId: depts[0].id,
        costCenterId: centers[0].id,
        neededBy: "2026-12-31",
        justification: "Should be blocked by CSRF guard",
        lines: [
          { description: "Forged Item", quantity: 1, estimatedPrice: "100.00", unit: "UNIT" },
        ],
      }),
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as any;
    expect(body.code).toBe("CSRF_INVALID");
  });
});
