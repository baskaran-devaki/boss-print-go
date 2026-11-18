import { Capacitor, registerPlugin } from "@capacitor/core";

type PaymentResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type CheckoutOptions = { key: string; amount: number; currency: string; order_id: string; name: string; prefill: { name: string; contact?: string } };
const upiFirst = { display: { blocks: { upi: { name: "Pay using UPI", instruments: [{ method: "upi" }] } }, sequence: ["block.upi"], preferences: { show_default_blocks: true } } };
type Options = CheckoutOptions & { config: typeof upiFirst; handler: (response: PaymentResponse) => void; modal: { ondismiss: () => void }; retry: { enabled: boolean } };
declare global { interface Window { Razorpay?: new (options: Options) => { open: () => void; close: () => void; on: (event: string, callback: () => void) => void } } }
const native = registerPlugin<{ open(options: CheckoutOptions & { config: typeof upiFirst }): Promise<PaymentResponse> }>("BossRazorpay");
export class CheckoutDismissed extends Error {
  constructor() { super("Payment cancelled or failed."); this.name = "CheckoutDismissed"; }
}
let loading: Promise<void> | undefined;
export async function loadCheckout() {
  if (Capacitor.isNativePlatform()) {
    if (Capacitor.getPlatform() !== "android" || !Capacitor.isPluginAvailable("BossRazorpay")) throw new Error("Please install the updated BOSS PrintGo Android app to pay using UPI.");
    return;
  }
  if (window.Razorpay) return;
  if (!loading) loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    const failed = () => { script.remove(); loading = undefined; reject(new Error("Could not load payment checkout. Please check your internet connection.")); };
    const timer = window.setTimeout(failed, 20000);
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => { window.clearTimeout(timer); if (window.Razorpay) resolve(); else failed(); };
    script.onerror = () => { window.clearTimeout(timer); failed(); };
    document.head.appendChild(script);
  });
  return loading;
}
export async function openCheckout(options: CheckoutOptions) {
  await loadCheckout();
  if (Capacitor.isNativePlatform()) {
    try { return await native.open({ ...options, config: upiFirst }); }
    catch (error) {
      if (error && typeof error === "object" && "code" in error && (error.code === "PAYMENT_CANCELLED" || error.code === "PAYMENT_FAILED")) throw new CheckoutDismissed();
      throw error;
    }
  }
  return new Promise<PaymentResponse>((resolve, reject) => {
    const checkout = new window.Razorpay!({ ...options, config: upiFirst, retry: { enabled: false }, handler: resolve, modal: { ondismiss: () => reject(new CheckoutDismissed()) } });
    checkout.on("payment.failed", () => { checkout.close(); reject(new CheckoutDismissed()); });
    checkout.open();
  });
}
