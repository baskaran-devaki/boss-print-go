import { createServerFn } from "@tanstack/react-start";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  orderUpdateSchema,
  paymentSettingsSchema,
  requireAdminAccess,
  submitOrderSchema,
  trackOrderSchema,
  type OrderSummary,
  type PaymentSettings,
  type TrackedOrder,
} from "./orders";

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
    if (data.filePaths.some((p) => !p.startsWith("order-uploads/")) || (data.screenshotPath && !data.screenshotPath.startsWith("order-uploads/"))) {
      throw new Error("Invalid upload reference. Please try again.");
    }
    const { data: rows, error: quoteError } = await publicClient().rpc("quote_print", {
      _service: data.service, _paper_size: data.paperSize, _color_mode: data.colorMode, _pages: data.pages, _copies: data.copies,
    });
    const quote = rows?.[0];
    if (quoteError || !quote) throw new Error("This print option is unavailable. Refresh pricing and try again.");
    const totalSides = Number(quote.total_sides);
    const totalAmount = Number(quote.total_amount);
    if (!Number.isFinite(totalAmount) || totalSides < 1) throw new Error("Could not calculate the order total. Please try again.");
    if (data.expectedTotal !== totalAmount) throw new Error("Price changed. Review the updated total and try again.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_name: data.customerName,
        mobile: data.mobile ?? null,
        service: data.service,
        paper_size: data.paperSize,
        color_mode: data.colorMode,
        pages: data.pages,
        copies: data.copies,
        total_sides: totalSides,
        total_amount: totalAmount,
        utr: data.utr,
        file_paths: data.filePaths,
        screenshot_path: data.screenshotPath ?? null,
      })
      .select("order_code, tracking_token")
      .single();
    if (error || !order) throw new Error("Could not submit the order. Please try again.");
    return { orderCode: order.order_code, trackingToken: order.tracking_token, totalAmount };
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
  const { data, error } = await context.supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error("Could not load orders");
  return (data ?? []).map((o) => ({
    id: o.id,
    orderCode: o.order_code,
    customerName: o.customer_name,
    mobile: o.mobile,
    service: o.service,
    paperSize: o.paper_size,
    colorMode: o.color_mode,
    pages: o.pages,
    copies: o.copies,
    totalSides: Number(o.total_sides),
    totalAmount: Number(o.total_amount),
    utr: o.utr,
    filePaths: Array.isArray(o.file_paths) ? (o.file_paths as string[]) : [],
    screenshotPath: o.screenshot_path,
    paymentStatus: o.payment_status,
    orderStatus: o.order_status,
    createdAt: o.created_at,
  }));
});

export const updateOrder = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => orderUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const patch: Record<string, string> = {};
    if (data.paymentStatus) patch.payment_status = data.paymentStatus;
    if (data.orderStatus) patch.order_status = data.orderStatus;
    if (Object.keys(patch).length === 0) throw new Error("Nothing to update");
    const { error } = await context.supabase.from("orders").update(patch).eq("id", data.id);
    if (error) throw new Error("Could not update the order");
    return { ok: true };
  });

// Short-lived signed URLs so only this admin, for the next few minutes, can open private files.
export const getOrderFileUrls = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ paths: z.array(z.string().min(1).max(300)).min(1).max(500) }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    if (data.paths.some((p) => !p.startsWith("order-uploads/"))) throw new Error("Invalid file reference");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage.from("order-uploads").createSignedUrls(data.paths, 600);
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
