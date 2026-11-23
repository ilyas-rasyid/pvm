import { test, expect } from "bun:test";
import { normalizeInvoice } from "../../src/features/invoices/invoice.service";
test("invoice identity normalizes whitespace and case", () => {
  expect(normalizeInvoice(" inv   001 ")).toBe("INV 001");
});
