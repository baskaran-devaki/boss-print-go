import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ native: false, installed: false, open: vi.fn() }));
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => state.native, getPlatform: () => "android", isPluginAvailable: () => state.installed },
  registerPlugin: () => ({ open: state.open }),
}));
import { CheckoutDismissed, loadCheckout, openCheckout } from "./razorpay-checkout";
const options = { key: "rzp_test_example", amount: 100, currency: "INR", order_id: "order_example", name: "BOSS PrintGo", prefill: { name: "Student" } };
let modal: { ondismiss: () => void };
let success: (data: any) => void;
let failed: () => void;
const close = vi.fn();
beforeEach(() => {
  state.native = false; state.installed = false; state.open.mockReset(); close.mockReset();
  window.Razorpay = class {
    constructor(input: any) { modal = input.modal; success = input.handler; }
    open() {}
    close() { close(); }
    on(_event: string, callback: () => void) { failed = callback; }
  };
});
describe("payment checkout outcomes", () => {
  it("returns a typed dismissal when the customer closes web checkout", async () => {
    const pending = openCheckout(options);
    await Promise.resolve(); await Promise.resolve();
    modal.ondismiss();
    await expect(pending).rejects.toBeInstanceOf(CheckoutDismissed);
  });
  it("closes failed checkout and returns a fresh-form dismissal", async () => {
    const pending = openCheckout(options);
    await Promise.resolve(); await Promise.resolve();
    failed();
    await expect(pending).rejects.toBeInstanceOf(CheckoutDismissed);
    expect(close).toHaveBeenCalledOnce();
  });
  it("does not turn a success into cancellation when checkout closes afterwards", async () => {
    const pending = openCheckout(options);
    await Promise.resolve(); await Promise.resolve();
    const response = { razorpay_order_id: "order_example", razorpay_payment_id: "pay_example", razorpay_signature: "signature" };
    success(response); modal.ondismiss();
    await expect(pending).resolves.toEqual(response);
  });
  it("uses the installed native bridge instead of web checkout on Android", async () => {
    state.native = true; state.installed = true;
    state.open.mockResolvedValue({ razorpay_payment_id: "pay_example" });
    await openCheckout(options);
    expect(state.open).toHaveBeenCalledWith(expect.objectContaining({ ...options, config: expect.objectContaining({ display: expect.objectContaining({ sequence: ["block.upi"] }) }) }));
  });
  it("converts native cancellation to the same fresh-form outcome", async () => {
    state.native = true; state.installed = true;
    state.open.mockRejectedValue({ code: "PAYMENT_CANCELLED" });
    await expect(openCheckout(options)).rejects.toBeInstanceOf(CheckoutDismissed);
  });
  it("blocks old APKs before uploading files or taking a payment", async () => {
    state.native = true;
    await expect(loadCheckout()).rejects.toThrow("updated BOSS PrintGo Android app");
    expect(state.open).not.toHaveBeenCalled();
  });
});
