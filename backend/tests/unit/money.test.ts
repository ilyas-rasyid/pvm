import { test, expect } from "bun:test";
import { money, totalLine, cumulativeTax, available } from "../../src/shared/finance/money";
test("financial calculations use exact decimal rounding", () => {
  expect(totalLine(8, "2500000.00", "0.11")).toBe("22200000.00");
  expect(money(available("100000000", "24000000", "16000000"))).toBe("60000000.00");
  expect(cumulativeTax(3, "0.01", "0.11").toFixed(2)).toBe("0.00");
});
