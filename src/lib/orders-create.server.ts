import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { bindingPaperCount } from "./pricing";
import { checkoutOrderSchema } from "./orders";
import type { z } from "zod";
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

export async function createPrintOrder(data: z.infer<typeof checkoutOrderSchema>, gateway = false) {
    const { findCustomer } = await import("./customers.server");
    const customer = await findCustomer();
    if (!customer) throw new Error("Please enter your customer details before ordering.");
    // Storage paths are relative to the private "order-uploads" bucket.
    const badPath = (p: string) => p.startsWith("/") || p.includes("..") || p.length > 300;
    if (data.filePaths.some(badPath) || (data.screenshotPath && badPath(data.screenshotPath))) {
      throw new Error("Invalid upload reference. Please try again.");
    }
    const { data: rows, error: quoteError } = await publicClient().rpc("quote_print", {
      _service: data.service, _paper_size: data.paperSize, _color_mode: data.colorMode, _pages: data.pages, _copies: data.copies,
    });
    const quote = rows?.[0];
    if (quoteError || !quote) throw new Error("This print option is unavailable. Refresh pricing and try again.");
    const totalSides = Number(quote.total_sides);
    let bindingAmount = 0;
    if (data.spiralBinding) {
      const { data: perSet, error: bindError } = await publicClient().rpc("quote_binding", { _pages: bindingPaperCount(data.pages, data.printSides) });
      if (bindError || perSet === null || perSet === undefined) throw new Error("Spiral binding is unavailable for this paper count.");
      bindingAmount = (Math.round(Number(perSet) * 100) * data.copies) / 100;
    }
    const totalAmount = (Math.round(Number(quote.total_amount) * 100) + Math.round(bindingAmount * 100)) / 100;
    if (!Number.isFinite(totalAmount) || totalSides < 1) throw new Error("Could not calculate the order total. Please try again.");
    if (data.expectedTotal !== totalAmount) throw new Error("Price changed. Review the updated total and try again.");
    if (gateway && Math.round(totalAmount * 100) < 100) throw new Error("Online payment minimum is ₹1.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as SupabaseClient;
    const { data: order, error } = await db
      .from("orders")
      .insert({
        ...(gateway ? { payment_provider: "razorpay" } : {}),
        customer_id: customer.id,
        customer_name: customer.name,
        mobile: customer.mobile,
        service: data.service,
        paper_size: data.paperSize,
        color_mode: data.colorMode,
        print_sides: data.printSides,
        pages: data.pages,
        copies: data.copies,
        spiral_binding: data.spiralBinding,
        binding_amount: bindingAmount,
        total_sides: totalSides,
        total_amount: totalAmount,
        utr: data.utr ?? null,
        file_paths: data.filePaths,
        screenshot_path: data.screenshotPath ?? null,
      })
      .select("id, order_code, tracking_token")
      .single();
    if (error || !order) throw new Error("Could not submit the order. Please try again.");
    return { id: order.id as string, orderCode: order.order_code, trackingToken: order.tracking_token, totalAmount };
}
