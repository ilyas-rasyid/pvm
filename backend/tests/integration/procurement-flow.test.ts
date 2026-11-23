import { test, expect, describe } from "bun:test";
import { createTestClient } from "./test-client";
import { db } from "../../src/infrastructure/database/prisma-client";

describe("Procurement Lifecycle & Advanced Workflows", () => {
  test("Complete E2E cycle: PR -> Manager Approval -> RFQ -> Quote -> Award -> PO -> Issue -> GR -> Invoice -> 3-way Match -> Ready for Payment", async () => {
    const emp = await createTestClient("employee@pvms.demo");
    const mgr = await createTestClient("department-manager@pvms.demo");
    const proc = await createTestClient("procurement-officer@pvms.demo");
    const rec = await createTestClient("receiving-officer@pvms.demo");
    const fin = await createTestClient("finance-officer@pvms.demo");

    // 1. Employee creates PR
    const depts = await emp.get("/reference/departments");
    const deptId = depts[0].id;
    const centers = await emp.get("/admin/cost-centers");
    const centerId = centers.find((c: any) => c.departmentId === deptId).id;

    const pr = await emp.post("/purchase-requests", {
      title: "Workstation Refresh Integration Suite",
      departmentId: deptId,
      costCenterId: centerId,
      neededBy: "2026-12-20",
      justification: "Critical testing workstations for QA laboratory",
      lines: [
        {
          description: "Precision Workstation 64GB",
          quantity: 2,
          estimatedPrice: "25000000.00",
          unit: "UNIT",
        },
      ],
    });
    expect(pr.status).toBe("DRAFT");
    expect(pr.reference).toMatch(/^PR-\d{4}-\d{6}$/);

    // Submit PR
    await emp.get(`/purchase-requests/${pr.id}`);
    const submittedPr = await emp.post(
      `/purchase-requests/${pr.id}/submit`,
      {},
      `/purchase-requests/${pr.id}`,
    );
    expect(submittedPr.status).toBe("SUBMITTED");

    // 2. Department Manager Approves
    await mgr.get(`/purchase-requests/${pr.id}`);
    const approvedPr = await mgr.post(
      `/purchase-requests/${pr.id}/approve`,
      {},
      `/purchase-requests/${pr.id}`,
    );
    expect(approvedPr.status).toBe("APPROVED");

    // 3. Procurement creates RFQ
    const fullPr = await proc.get(`/purchase-requests/${pr.id}`);
    const prLineId = fullPr.lines[0].id;
    const vendors = await proc.get("/vendors?pageSize=10");
    const v1 = vendors.find((v: any) => v.code === "VN-001");
    const v2 = vendors.find((v: any) => v.code === "VN-002");

    const rfq = await proc.post("/rfqs", {
      requestId: pr.id,
      deadline: "2026-12-15T00:00:00.000Z",
      vendorIds: [v1.id, v2.id],
      lines: [{ requestLineId: prLineId, quantity: 2 }],
    });
    expect(rfq.status).toBe("DRAFT");

    await proc.get(`/rfqs/${rfq.id}`);
    const openRfq = await proc.post(`/rfqs/${rfq.id}/open`, {}, `/rfqs/${rfq.id}`);
    expect(openRfq.status).toBe("OPEN");

    // Record initial quote
    const rfqWithLines = await proc.get(`/rfqs/${rfq.id}`);
    const rfqLineId = rfqWithLines.lines[0].id;
    const quoteRef = `Q-VN1-${Date.now().toString().slice(-6)}`;
    const quote = await proc.post(`/rfqs/${rfq.id}/record-quotation`, {
      vendorId: v1.id,
      reference: quoteRef,
      leadDays: 5,
      lines: [{ rfqLineId, quantity: 2, price: "24000000.00", taxRate: "0.11" }],
    });
    expect(quote.id).toBeDefined();

    // Test Quotation Revision
    const revisedQuote = await proc.post(`/rfqs/${rfq.id}/quotations/${quote.id}/revisions`, {
      vendorId: v1.id,
      reference: `${quoteRef}-REV1`,
      leadDays: 4,
      notes: "Discounted commercial offer",
      lines: [{ rfqLineId, quantity: 2, price: "23500000.00", taxRate: "0.11" }],
    });
    expect(revisedQuote.number).toBe(2);

    // Evaluate RFQ
    await proc.get(`/rfqs/${rfq.id}`);
    const evalRfq = await proc.post(`/rfqs/${rfq.id}/evaluate`, {}, `/rfqs/${rfq.id}`);
    expect(evalRfq.status).toBe("EVALUATION");

    // Award to revised quote line
    const rfqDetails = await proc.get(`/rfqs/${rfq.id}`);
    const awardQuoteLineId = rfqDetails.quotations[0].revisions.find((r: any) => r.number === 2)
      .lines[0].id;

    const award = await proc.post(
      `/rfqs/${rfq.id}/award`,
      {
        reason: "Revised quote provides lowest compliant rate and fast delivery",
        lines: [{ rfqLineId, quotationLineId: awardQuoteLineId, quantity: 2 }],
      },
      `/rfqs/${rfq.id}`,
    );
    expect(award.lines.length).toBe(1);

    // 4. Create and Issue PO
    const periods = await proc.get("/admin/fiscal-periods");
    const period = periods.find((p: any) => p.code === "FY2026");

    const po = await proc.post("/purchase-orders", {
      requestId: pr.id,
      vendorId: v1.id,
      fiscalPeriodId: period.id,
      sourcingMode: "RFQ",
      lines: [
        {
          requestLineId: prLineId,
          awardLineId: award.lines[0].id,
          quantity: 2,
          price: "23500000.00",
          taxRate: "0.11",
        },
      ],
    });
    expect(po.status).toBe("DRAFT");

    await proc.get(`/purchase-orders/${po.id}`);
    const issuedPo = await proc.post(
      `/purchase-orders/${po.id}/issue`,
      {},
      `/purchase-orders/${po.id}`,
    );
    expect(issuedPo.status).toBe("ISSUED");
    expect(Number(issuedPo.committed)).toBe(52170000);

    // Test PO Amendment: amend price slightly before delivery
    await proc.get(`/purchase-orders/${po.id}`);
    const amendedPo = await proc.post(
      `/purchase-orders/${po.id}/amend`,
      {
        reason: "Agreed slight price adjustment for express transit",
        changes: [
          {
            lineId: issuedPo.lines[0].id,
            price: "23600000.00",
            taxRate: "0.11",
          },
        ],
      },
      `/purchase-orders/${po.id}`,
    );
    expect(Number(amendedPo.total)).toBe(52392000);
    expect(Number(amendedPo.committed)).toBe(52392000);

    // 5. Receiving Goods
    const fullPo = await rec.get(`/purchase-orders/${po.id}`);
    const poLineId = fullPo.lines[0].id;

    const gr = await rec.post("/goods-receipts", {
      orderId: po.id,
      deliveryReference: `DEL-${Date.now().toString().slice(-6)}`,
      note: "All 2 units unpacked and verified functional",
      lines: [{ orderLineId: poLineId, deliveredQty: 2, acceptedQty: 2, rejectedQty: 0 }],
    });
    expect(gr.status).toBe("DRAFT");

    await rec.get(`/goods-receipts/${gr.id}`);
    const postedGr = await rec.post(
      `/goods-receipts/${gr.id}/post`,
      {},
      `/goods-receipts/${gr.id}`,
    );
    expect(postedGr.status).toBe("POSTED");

    // Verify PO status transitioned to FULLY_RECEIVED
    const refreshedPo = await proc.get(`/purchase-orders/${po.id}`);
    expect(refreshedPo.status).toBe("FULLY_RECEIVED");

    // 6. Vendor Invoice & Matching
    const invNumber = `INV-${Date.now().toString().slice(-6)}`;
    const inv = await fin.post("/invoices", {
      orderId: po.id,
      vendorId: v1.id,
      number: invNumber,
      invoiceDate: "2026-11-23",
      lines: [{ orderLineId: poLineId, quantity: 2, price: "23600000.00", taxRate: "0.11" }],
    });
    expect(inv.status).toBe("DRAFT");

    // Test Invoice Correction while draft
    await fin.get(`/invoices/${inv.id}`);
    const correctedInv = await fin.patch(
      `/invoices/${inv.id}`,
      {
        number: `${invNumber}-CORR`,
      },
      `/invoices/${inv.id}`,
    );
    expect(correctedInv.number).toBe(`${invNumber}-CORR`);

    // Submit invoice
    await fin.get(`/invoices/${inv.id}`);
    const submittedInv = await fin.post(`/invoices/${inv.id}/submit`, {}, `/invoices/${inv.id}`);
    expect(submittedInv.status).toBe("SUBMITTED");

    // 3-way Matching
    await fin.get(`/invoices/${inv.id}`);
    const matchedInv = await fin.post(`/invoices/${inv.id}/match`, {}, `/invoices/${inv.id}`);
    expect(matchedInv.status).toBe("MATCHED");
    expect(matchedInv.discrepancies.length).toBe(0);

    // Final Verification -> READY_FOR_PAYMENT
    await fin.get(`/invoices/${inv.id}`);
    const verifiedInv = await fin.post(
      `/invoices/${inv.id}/final-verify`,
      {},
      `/invoices/${inv.id}`,
    );
    expect(verifiedInv.status).toBe("READY_FOR_PAYMENT");

    // Verify PO committed is now zero
    const finalPo = await proc.get(`/purchase-orders/${po.id}`);
    expect(Number(finalPo.committed)).toBe(0);
  });

  test("Vendor contact lifecycle: create, update, list, deactivate", async () => {
    const proc = await createTestClient("procurement-officer@pvms.demo");
    const vendors = await proc.get("/vendors?pageSize=5");
    const targetVendor = vendors[0];

    // Create contact
    const contact = await proc.post(`/vendors/${targetVendor.id}/contacts`, {
      name: "Budi Santoso",
      email: "budi.santoso@vendor.example.test",
      phone: "+628123456789",
      title: "Sales Director",
      primary: true,
    });
    expect(contact.name).toBe("Budi Santoso");
    expect(contact.primary).toBe(true);

    // List contacts
    const contacts = await proc.get(`/vendors/${targetVendor.id}/contacts`);
    expect(contacts.some((c: any) => c.id === contact.id)).toBe(true);

    // Update contact
    const updated = await proc.patch(`/vendors/${targetVendor.id}/contacts/${contact.id}`, {
      title: "Senior VP Commercial",
    });
    expect(updated.title).toBe("Senior VP Commercial");

    // Deactivate contact
    const deactivated = await proc.del(`/vendors/${targetVendor.id}/contacts/${contact.id}`);
    expect(deactivated.active).toBe(false);
  });
});
