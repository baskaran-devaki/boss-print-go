import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { checkoutOrderSchema, trackOrderSchema } from "./orders";

export const createCheckout = createServerFn({ method: "POST" })
  .inputValidator((input) => checkoutOrderSchema.parse(input))
  .handler(async ({ data }) => {
    const { credentials, gateway } = await import("./razorpay.server");
    const { key } = credentials();
    const { createPrintOrder } = await import("./orders-create.server");
    // Persist files and server-quoted print settings before taking any payment.
    const order = await createPrintOrder(data, true);
    const amount = Math.round(order.totalAmount * 100);
    if (!Number.isSafeInteger(amount) || amount < 100) throw new Error("Online payment minimum is ₹1.");
    const remote = await gateway("orders", { amount, currency: "INR", receipt: order.id });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as import("@supabase/supabase-js").SupabaseClient;
    const { error } = await db.from("orders").update({ razorpay_order_id: remote.id }).eq("id", order.id);
    if (error) throw new Error("Could not prepare payment. No payment was taken.");
    return { ...order, key, orderId: String(remote.id), amount, currency: "INR" };
  });

export const verifyCheckout = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: trackOrderSchema.shape.token, razorpay_order_id: z.string().regex(/^order_[A-Za-z0-9]+$/), razorpay_payment_id: z.string().regex(/^pay_[A-Za-z0-9]+$/), razorpay_signature: z.string().regex(/^[a-f0-9]{64}$/i) }).parse(input))
  .handler(async ({ data }) => {
    const { ownedOrder, credentials, validSignature, gateway, reconcile } = await import("./razorpay.server");
    const order = await ownedOrder(data.token);
    // Use the stored order ID, never trust the callback's order ID.
    if (order.razorpay_order_id !== data.razorpay_order_id || !validSignature(`${order.razorpay_order_id}|${data.razorpay_payment_id}`, data.razorpay_signature, credentials().secret)) throw new Error("Invalid payment signature.");
    return reconcile(order, await gateway(`payments/${data.razorpay_payment_id}`));
  });

export const checkCheckout = createServerFn({ method: "POST" })
  .inputValidator((input) => trackOrderSchema.parse(input))
  .handler(async ({ data }) => {
    const { ownedOrder, gateway, reconcile, summary } = await import("./razorpay.server");
    const order = await ownedOrder(data.token);
    if (order.payment_status === "verified" || !order.razorpay_order_id) return summary(order);
    const payments = await gateway(`orders/${order.razorpay_order_id}/payments`);
    const captured = payments.items?.find((p: any) => p.status === "captured");
    return captured ? reconcile(order, captured) : summary(order);
  });

export const resumeCheckout = createServerFn({ method: "POST" })
  .inputValidator((input) => trackOrderSchema.parse(input))
  .handler(async ({ data }) => {
    const { ownedOrder, credentials, gateway, reconcile, summary } = await import("./razorpay.server");
    const order = await ownedOrder(data.token);
    if (!order.razorpay_order_id) throw new Error("This payment was not started. Contact the shop with your order details.");
    const payments = await gateway(`orders/${order.razorpay_order_id}/payments`);
    const captured = payments.items?.find((p: any) => p.status === "captured");
    const result = captured ? await reconcile(order, captured) : summary(order);
    if (!result.paid && payments.items?.some((p: any) => p.status === "authorized")) throw new Error("Payment is processing. Please check again shortly; do not pay again.");
    return { ...result, key: credentials().key, orderId: String(order.razorpay_order_id), amount: Math.round(Number(order.total_amount) * 100), currency: "INR" };
  });
