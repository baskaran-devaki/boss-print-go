import { describe, expect, it } from "vitest";
import { calculateOrderTotal, storedOrderAmounts } from "./platform-fee";

describe("merchant platform fee", () => {
  it.each([[100, 2.5, 102.5], [1000, 25, 1025], [120, 3, 123], [1, 0.03, 1.03], [0.75, 0.02, 0.77], [99.99, 2.5, 102.49], [0, 0, 0]])("calculates subtotal %s with one paise-rounded fee", (subtotal, fee, total) => {
    const amounts = calculateOrderTotal(subtotal);
    expect(amounts).toEqual({ subtotalAmount: subtotal, platformFeeAmount: fee, platformFeeRateBps: 250, totalAmount: total });
  });
  it("rejects invalid/unsafe money and invalid rates", () => {
    for (const amount of [-1, NaN, Infinity, Number.MAX_SAFE_INTEGER]) expect(() => calculateOrderTotal(amount)).toThrow();
    for (const bps of [-1, 2.5, 10001]) expect(() => calculateOrderTotal(100, bps)).toThrow();
  });
  it("does not reprice a historical fee-free order", () => {
    expect(storedOrderAmounts({ total_amount: "100" })).toEqual({ subtotalAmount: 100, platformFeeAmount: 0, platformFeeRateBps: 0, totalAmount: 100 });
    expect(storedOrderAmounts({ total_amount: "100", subtotal_amount: null, platform_fee_amount: "0", platform_fee_rate_bps: 0 }).totalAmount).toBe(100);
  });
  it("uses stored rate and amounts even when they differ from today's rate", () => {
    expect(storedOrderAmounts({ total_amount: "101", subtotal_amount: "100", platform_fee_amount: "1", platform_fee_rate_bps: 100 })).toEqual({ subtotalAmount: 100, platformFeeAmount: 1, platformFeeRateBps: 100, totalAmount: 101 });
  });
});
