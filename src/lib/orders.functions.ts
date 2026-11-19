import { uploadsExpired } from "./order-retention";
import { createServerFn } from "@tanstack/react-start";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  orderUpdateSchema,
  paymentSettingsSchema,
  submitOrderSchema,
  trackOrderSchema,
  type OrderSummary,
  type PaymentSettings,
  type TrackedOrder,
} from "./orders";
import { bindingPaperCount, requireAdminAccess } from "./pricing";

// Public publishable client: only reads data exposed through narrow security-definer RPCs.
function publicClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Service is unavailable. Please try again.");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
}

async function requireAdmin(context: { supabase: SupabaseClient<Database>; userId: string }) {
  const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  requireAdminAccess(allowed);
}

export const getPaymentSettings = createServerFn({ method: "GET" }).handler(async (): Promise<PaymentSettings> => {
  const { data, error } = await publicClient().rpc("public_payment_settings").single();
  if (error || !data) throw new Error("Could not load payment options. Please try again.");
  return { upiId: data.upi_id, gpayNumber: data.gpay_number, payeeName: data.payee_name, qrImage: data.qr_image ?? null };
});

// Guest order submission: the amount always comes from a fresh database quote,
// and the submitted order is rejected when the quoted total no longer matches
// the amount the customer saw and paid.
export const submitOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => submitOrderSchema.parse(input))
  .handler(async ({ data }) => {
    const { createPrintOrder } = await import("./orders-create.server");
    return createPrintOrder(data);
  });

export const trackOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => trackOrderSchema.parse(input))
  .handler(async ({ data }): Promise<TrackedOrder | null> => {
    const { data: rows, error } = await publicClient().rpc("track_order", { _token: data.token });
    if (error) throw new Error("Could not load tracking. Please try again.");
    const row = rows?.[0];
    if (!row) return null;
    return {
      orderCode: row.order_code,
      paymentStatus: row.payment_status,
      orderStatus: row.order_status,
      totalAmount: Number(row.total_amount),
      totalSides: Number(row.total_sides),
      pages: row.pages,
      copies: row.copies,
      createdAt: row.created_at,
    };
  });

export const getAdminOrders = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }): Promise<OrderSummary[]> => {
  await requireAdmin(context);
  const { data, error } = await context.supabase.from("orders").select("*").or("payment_provider.neq.razorpay,and(payment_status.eq.verified,razorpay_payment_id.not.is.null)").order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error("Could not load orders");
  return (data ?? []).map((o) => ({
    id: o.id,
    orderCode: o.order_code,
    customerName: o.customer_name,
    mobile: o.mobile,
    service: o.service,
    paperSize: o.paper_size,
    colorMode: o.color_mode,
    printSides: o.print_sides === "double" ? "double" : "single",
    spiralBinding: o.spiral_binding,
    bindingAmount: Number(o.binding_amount),
    pages: o.pages,
    copies: o.copies,
    totalSides: Number(o.total_sides),
    totalAmount: Number(o.total_amount),
    utr: o.utr,
    filePaths: !uploadsExpired(o as unknown as { picked_up_at?: string; files_deleted_at?: string }) && Array.isArray(o.file_paths) ? (o.file_paths as string[]) : [],
    screenshotPath: uploadsExpired(o as unknown as { picked_up_at?: string; files_deleted_at?: string }) ? null : o.screenshot_path,
    paymentProvider: (o as unknown as { payment_provider?: string }).payment_provider ?? "manual",
    paymentStatus: o["payment_status"],
    orderStatus: o["order_status"],
    createdAt: o.created_at,
  }));
});

export const updateOrder = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => orderUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const patch: Database["public"]["Tables"]["orders"]["Update"] = {};
    if (data.paymentStatus) patch.payment_status = data.paymentStatus;
    if (data.orderStatus) patch.order_status = data.orderStatus;
    if (Object.keys(patch).length === 0) throw new Error("Nothing to update");
    let update = context.supabase.from("orders").update(patch).eq("id", data.id);
    // Gateway payment status is controlled only by server capture verification.
    if (data.paymentStatus) update = update.filter("payment_provider", "neq", "razorpay");
    const { error } = await update.select("id").single();
    if (error) throw new Error("Could not update the order");
    return { ok: true };
  });

// Short-lived signed URLs so only this admin, for the next few minutes, can open private files.
export const getOrderFileUrls = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ paths: z.array(z.string().min(1).max(300)).min(1).max(500) }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (data.paths.some((p) => p.startsWith("/") || p.includes(".."))) throw new Error("Invalid file reference");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as SupabaseClient;
    const { data: allowed, error: accessError } = await db.rpc("live_order_uploads", { _paths: data.paths });
    const rows = (allowed ?? []) as { path: string; ttl: number }[];
    if (accessError || data.paths.some(path => !rows.some(row => row.path === path && row.ttl > 0))) throw new Error("These files expired or are unavailable.");
    const ttl = Math.min(600, ...rows.map(row => row.ttl));
    const { data: signed, error } = await supabaseAdmin.storage.from("order-uploads").createSignedUrls(data.paths, ttl);
    if (error || !signed) throw new Error("Could not open the files. Please try again.");
    return signed.map((file) => ({ path: file.path ?? "", url: file.signedUrl ?? "" }));
  });

export const getAdminPaymentSettings = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }): Promise<PaymentSettings> => {
  await requireAdmin(context);
  const { data, error } = await context.supabase.from("payment_settings").select("upi_id, gpay_number, payee_name, qr_image").eq("id", true).single();
  if (error || !data) throw new Error("Could not load payment settings");
  return { upiId: data.upi_id, gpayNumber: data.gpay_number, payeeName: data.payee_name, qrImage: data.qr_image ?? null };
});

export const savePaymentSettings = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => paymentSettingsSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { error } = await context.supabase.from("payment_settings").update({
      upi_id: data.upiId,
      gpay_number: data.gpayNumber ?? "",
      payee_name: data.payeeName,
      qr_image: data.qrImage ?? null,
    }).eq("id", true);
    if (error) throw new Error("Could not save payment settings");
    return { ok: true };
  });
