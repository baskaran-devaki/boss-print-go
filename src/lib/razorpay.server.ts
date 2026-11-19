import { storedOrderAmounts } from "./platform-fee";
import { createHmac, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { SupabaseClient } from "@supabase/supabase-js";

const db = supabaseAdmin as unknown as SupabaseClient;
export function credentials() {
  const key = process.env["RAZORPAY_KEY_ID"];
  const secret = process.env["RAZORPAY_KEY_SECRET"];
  if (!key || !secret) throw new Error("Online payment is not configured. Please contact the shop.");
  return { key, secret };
}
export function validSignature(message: string, signature: string, secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(message).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}
export async function gateway(path: string, body?: object) {
  const { key, secret } = credentials();
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(response.status === 401 ? "Payment gateway credentials were rejected. Please contact the shop." : "Payment service is unavailable. Please try again.");
  return response.json();
}
export async function ownedOrder(token: string) {
  const { findCustomer } = await import("./customers.server");
  const customer = await findCustomer();
  if (!customer) throw new Error("Please sign in again. Your order remains saved.");
  const { data, error } = await db.from("orders").select("*").eq("tracking_token", token).eq("customer_id", customer.id).eq("payment_provider", "razorpay").single();
  if (error || !data) throw new Error("Payment order not found.");
  return data;
}
export function summary(order: any) {
  return { orderCode: String(order.order_code), trackingToken: String(order.tracking_token), ...storedOrderAmounts(order), paid: order.payment_status === "verified" };
}
// Both the browser verifier and webhook use the same amount/order/capture checks.
export async function reconcile(order: any, payment: any) {
  if (payment.order_id !== order.razorpay_order_id || payment.currency !== "INR" || Number(payment.amount) !== Math.round(Number(order.total_amount) * 100)) throw new Error("Payment does not match this order.");
  if (payment.status !== "captured") return summary(order);
  const { error } = await db.from("orders").update({ payment_status: "verified", razorpay_payment_id: payment.id }).eq("id", order.id).eq("razorpay_order_id", payment.order_id);
  if (error) throw new Error("Payment received. Please check payment status again; do not pay again.");
  return summary({ ...order, payment_status: "verified" });
}
export async function webhook(raw: string, signature: string) {
  const secret = process.env["RAZORPAY_WEBHOOK_SECRET"];
  if (!secret) throw new Error("Webhook not configured");
  if (!validSignature(raw, signature, secret)) return false;
  const event = JSON.parse(raw);
  if (event.event !== "payment.captured") return true;
  const payment = event.payload?.payment?.entity;
  if (!payment?.order_id) throw new Error("Missing payment");
  const { data, error } = await db.from("orders").select("*").eq("razorpay_order_id", payment.order_id).single();
  if (error || !data) throw new Error("Order not available yet");
  await reconcile(data, payment);
  return true;
}
