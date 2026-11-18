type PaymentResponse = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type Options = { key: string; amount: number; currency: string; order_id: string; name: string; prefill: { name: string; contact?: string }; handler: (response: PaymentResponse) => void; modal: { ondismiss: () => void } };
declare global { interface Window { Razorpay?: new (options: Options) => { open: () => void; on: (event: string, callback: () => void) => void } } }
let loading: Promise<void> | undefined;
export async function loadCheckout() {
  if (window.Razorpay) return;
  if (!loading) loading = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => window.Razorpay ? resolve() : reject(new Error("Could not load payment checkout."));
    script.onerror = () => { script.remove(); loading = undefined; reject(new Error("Could not load payment checkout. Please check your internet connection.")); };
    document.head.appendChild(script);
  });
  return loading;
}
export async function openCheckout(options: Omit<Options, "handler" | "modal">) {
  await loadCheckout();
  return new Promise<PaymentResponse>((resolve, reject) => {
    const checkout = new window.Razorpay!({ ...options, handler: resolve, modal: { ondismiss: () => reject(new Error("Payment cancelled. Your unpaid order is saved.")) } });
    checkout.on("payment.failed", () => reject(new Error("Payment failed. Check payment status before trying again.")));
    checkout.open();
  });
}
