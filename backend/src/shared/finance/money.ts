import Decimal from "decimal.js";

import { AppError } from "../errors/app-error";

Decimal.set({ precision: 36, rounding: Decimal.ROUND_HALF_UP });
export const dec = (v: Decimal.Value) => new Decimal(v instanceof Decimal ? v : v.toString());
export const money = (v: Decimal.Value) => dec(v).toDecimalPlaces(2).toFixed(2);
export const available = (a: Decimal.Value, c: Decimal.Value, v: Decimal.Value) =>
  dec(a).minus(dec(c)).minus(dec(v));
export const totalLine = (qty: number, price: string, rate: string) => {
  const subtotal = dec(price).mul(qty);
  return money(subtotal.plus(subtotal.mul(rate).toDecimalPlaces(2)));
};
export const requireNonnegative = (v: Decimal, code = "AMOUNT_INVALID") => {
  if (!v.isFinite() || v.lt(0)) {
    throw new AppError(code, "Amount cannot be negative", 422);
  }
};
export function cumulativeTax(qty: number, price: string, rate: string) {
  return dec(qty).mul(price).mul(rate).toDecimalPlaces(2);
}
