import { describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {} }));
import { validSignature, reconcile } from "./razorpay.server";

describe("Razorpay payment security", () => {
  it("accepts a valid signature and rejects tampered IDs or malformed signatures", () => {
    const secret = "test-only-secret";
    const message = "order_example|pay_example";
    const signature = createHmac("sha256", secret).update(message).digest("hex");
    expect(validSignature(message, signature, secret)).toBe(true);
    expect(validSignature("order_other|pay_example", signature, secret)).toBe(false);
    expect(validSignature(message, "abc", secret)).toBe(false);
    expect(validSignature(message, "z".repeat(64), secret)).toBe(false);
  });
  it("rejects mismatched amount, currency and order before writing to the database", async () => {
    const order = { razorpay_order_id: "order_example", total_amount: 10 };
    const payment = { order_id: "order_example", currency: "INR", amount: 1000, status: "captured" };
    for (const patch of [{ amount: 100 }, { currency: "USD" }, { order_id: "order_other" }]) {
      await expect(reconcile(order, { ...payment, ...patch })).rejects.toThrow("does not match");
    }
  });
  it("does not approve an authorized but uncaptured payment", async () => {
    const result = await reconcile({ razorpay_order_id: "order_example", total_amount: 10, payment_status: "pending_verification" }, { order_id: "order_example", currency: "INR", amount: 1000, status: "authorized" });
    expect(result.paid).toBe(false);
  });
  it("rejects a captured subtotal-only payment when the stored total includes platform fee", async () => {
    await expect(reconcile({ razorpay_order_id: "order_example", total_amount: 102.5 }, { order_id: "order_example", currency: "INR", amount: 10000, status: "captured" })).rejects.toThrow("does not match");
  });

});
