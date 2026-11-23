import { test, expect, describe } from "bun:test";
import { createTestClient } from "./test-client";
import { db } from "../../src/infrastructure/database/prisma-client";

describe("PostgreSQL Concurrency & Data Integrity Guards", () => {
  test("Prevent over-receiving: concurrent Goods Receipts cannot exceed PO quantity", async () => {
    const emp = await createTestClient("employee@pvms.demo");
    const mgr = await createTestClient("department-manager@pvms.demo");
    const proc = await createTestClient("procurement-officer@pvms.demo");
    const rec1 = await createTestClient("receiving-officer@pvms.demo");
    const rec2 = await createTestClient("receiving-officer@pvms.demo");

    // Setup: PR -> PO (direct purchase of 5 units)
    const depts = await emp.get("/reference/departments");
    const centers = await emp.get("/admin/cost-centers");
    const periods = await proc.get("/admin/fiscal-periods");
    const vendors = await proc.get("/vendors?pageSize=5");

    const pr = await emp.post("/purchase-requests", {
      title: "Over-receiving concurrency fixture",
      departmentId: depts[0].id,
      costCenterId: centers[0].id,
      neededBy: "2026-12-31",
      justification: "Testing over-receiving race conditions",
      lines: [
        {
          description: "Industrial Monitors",
          quantity: 5,
          estimatedPrice: "1000000.00",
          unit: "UNIT",
        },
      ],
    });

    await emp.get(`/purchase-requests/${pr.id}`);
    await emp.post(`/purchase-requests/${pr.id}/submit`, {}, `/purchase-requests/${pr.id}`);
    await mgr.get(`/purchase-requests/${pr.id}`);
    await mgr.post(`/purchase-requests/${pr.id}/approve`, {}, `/purchase-requests/${pr.id}`);

    // Direct purchase exception & PO
    const exc = await proc.post("/direct-purchase-exceptions", {
      requestId: pr.id,
      vendorId: vendors[0].id,
      reason: "Direct emergency requisition for monitors",
    });

    const fullPr = await proc.get(`/purchase-requests/${pr.id}`);
    const po = await proc.post("/purchase-orders", {
      requestId: pr.id,
      vendorId: vendors[0].id,
      fiscalPeriodId: periods[0].id,
      sourcingMode: "DIRECT",
      directExceptionId: exc.id,
      lines: [
        {
          requestLineId: fullPr.lines[0].id,
          quantity: 5,
          price: "1000000.00",
          taxRate: "0",
        },
      ],
    });

    await proc.get(`/purchase-orders/${po.id}`);
    const issuedPo = await proc.post(
      `/purchase-orders/${po.id}/issue`,
      {},
      `/purchase-orders/${po.id}`,
    );
    const poLineId = issuedPo.lines[0].id;

    // Create 2 draft receipts of 4 units each (collective = 8, but PO has only 5!)
    const gr1 = await rec1.post("/goods-receipts", {
      orderId: po.id,
      deliveryReference: `CONC-1-${Date.now()}`,
      lines: [{ orderLineId: poLineId, deliveredQty: 4, acceptedQty: 4, rejectedQty: 0 }],
    });

    const gr2 = await rec2.post("/goods-receipts", {
      orderId: po.id,
      deliveryReference: `CONC-2-${Date.now()}`,
      lines: [{ orderLineId: poLineId, deliveredQty: 4, acceptedQty: 4, rejectedQty: 0 }],
    });

    await rec1.get(`/goods-receipts/${gr1.id}`);
    await rec2.get(`/goods-receipts/${gr2.id}`);

    // Concurrently post both receipts
    const results = await Promise.allSettled([
      rec1.post(`/goods-receipts/${gr1.id}/post`, {}, `/goods-receipts/${gr1.id}`),
      rec2.post(`/goods-receipts/${gr2.id}/post`, {}, `/goods-receipts/${gr2.id}`),
    ]);

    // Exactly one must succeed and one must be rejected with PO_RECEIVE_QUANTITY_EXCEEDED!
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    // Verify PO acceptedQty in database did not exceed 5
    const dbPoLine = await db.purchaseOrderLine.findUniqueOrThrow({ where: { id: poLineId } });
    expect(dbPoLine.acceptedQty).toBeLessThanOrEqual(5);
    expect(dbPoLine.acceptedQty).toBe(4);
  });

  test("Idempotency: Re-sending request with same Idempotency-Key returns cached result without duplicates", async () => {
    const emp = await createTestClient("employee@pvms.demo");
    const depts = await emp.get("/reference/departments");
    const centers = await emp.get("/admin/cost-centers");

    const idempotencyKey = crypto.randomUUID();
    const payload = {
      title: `Idempotent PR Creation Test - ${Date.now()}`,
      departmentId: depts[0].id,
      costCenterId: centers[0].id,
      neededBy: "2026-12-31",
      justification: "Verifying that retrying identical key never creates duplicate rows",
      lines: [
        { description: "Office Shredder", quantity: 1, estimatedPrice: "2000000.00", unit: "UNIT" },
      ],
    };

    // First request
    const data1 = await emp.post("/purchase-requests", payload, undefined, idempotencyKey);

    // Retry request with identical key and payload
    const data2 = await emp.post("/purchase-requests", payload, undefined, idempotencyKey);

    expect(data1.id).toBe(data2.id);
    expect(data1.reference).toBe(data2.reference);

    // Verify only 1 record exists in the database
    const count = await db.purchaseRequest.count({ where: { title: payload.title } });
    expect(count).toBe(1);
  });

  test("Prevent duplicate vendor invoice numbers per vendor", async () => {
    const fin = await createTestClient("finance-officer@pvms.demo");
    const orders = await fin.get("/purchase-orders?pageSize=5");
    const issuedOrder = orders.find((o: any) =>
      ["ISSUED", "PARTIALLY_RECEIVED", "FULLY_RECEIVED"].includes(o.status),
    );

    if (!issuedOrder) return; // Skip if no active order available

    const fullOrder = await fin.get(`/purchase-orders/${issuedOrder.id}`);
    const poLineId = fullOrder.lines[0].id;

    const uniqueNumber = `DUP-TEST-${Date.now().toString().slice(-6)}`;

    // Create first invoice
    const inv1 = await fin.post("/invoices", {
      orderId: issuedOrder.id,
      vendorId: fullOrder.vendorId,
      number: `  ${uniqueNumber.toLowerCase()}  `, // with whitespace and lowercase
      invoiceDate: "2026-11-23",
      lines: [
        {
          orderLineId: poLineId,
          quantity: 1,
          price: String(fullOrder.lines[0].price),
          taxRate: "0",
        },
      ],
    });
    expect(inv1.id).toBeDefined();

    // Attempt second invoice with same normalized number for the same vendor
    let error: any;
    try {
      await fin.post("/invoices", {
        orderId: issuedOrder.id,
        vendorId: fullOrder.vendorId,
        number: uniqueNumber.toUpperCase(),
        invoiceDate: "2026-11-23",
        lines: [
          {
            orderLineId: poLineId,
            quantity: 1,
            price: String(fullOrder.lines[0].price),
            taxRate: "0",
          },
        ],
      });
    } catch (e) {
      error = e;
    }
    expect(error).toBeDefined();
    expect(error.status).toBe(409);
  });
});
