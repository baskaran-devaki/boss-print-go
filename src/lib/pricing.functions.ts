import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { bindingRangeSchema, pricingSchema, quoteSchema, requireAdminAccess } from "./pricing";

export const getCustomerPricing = createServerFn({ method: "GET" }).handler(async () => {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) throw new Error("Pricing is unavailable");
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
  const [{ data, error }, { data: binding, error: bindError }] = await Promise.all([client.rpc("customer_pricing"), client.rpc("customer_binding_prices")]);
  if (error || bindError) throw new Error("Could not load pricing. Please try again.");
  return { rates: data ?? [], binding: (binding ?? []).map((r) => ({ min_pages: r.min_pages, max_pages: r.max_pages, price: Number(r.price) })) };
});

export const validateFinalPrice = createServerFn({ method: "POST" }).inputValidator((input) => quoteSchema.parse(input)).handler(async ({ data }) => {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) throw new Error("Pricing is unavailable");
  const client = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => {
      const headers = new Headers(init?.headers);
      if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) headers.delete("Authorization");
      headers.set("apikey", key);
      return fetch(input, { ...init, headers });
    } },
  });
  // This database function reads current rates. A client-provided amount is never accepted.
  const { data: rows, error } = await client.rpc("quote_print", {
    _service: data.service, _paper_size: data.paperSize, _color_mode: data.colorMode, _pages: data.pages, _copies: data.copies,
  });
  const quote = rows?.[0];
  if (error || !quote) throw new Error("This service or print option is unavailable. Refresh pricing and try again.");
  return quote;
});

export const checkAdmin = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error) throw new Error("Could not verify admin access");
  return data === true;
});

export const getAdminPricing = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  requireAdminAccess(allowed);
  const { data, error } = await context.supabase.from("service_pricing").select("*").eq("service", "printout").order("paper_size").order("color_mode");
  if (error) throw new Error("Could not load pricing");
  return data ?? [];
});

export const savePricing = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid().optional(), pricing: pricingSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    requireAdminAccess(allowed);
    const query = data.id
      ? context.supabase.from("service_pricing").update(data.pricing).eq("id", data.id)
      : context.supabase.from("service_pricing").insert(data.pricing);
    const { data: row, error } = await query.select().single();
    if (error) throw new Error(error.code === "23505" ? "Pricing already exists for this service, paper size and color." : "Could not save pricing");
    return row;
  });

export const deletePricing = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    requireAdminAccess(allowed);
    const { data: row, error } = await context.supabase.from("service_pricing").delete().eq("id", data.id).select("id").single();
    if (error || !row) throw new Error("Could not delete pricing");
    return { deleted: true };
  });
export const getAdminBinding = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  requireAdminAccess(allowed);
  const { data, error } = await context.supabase.from("binding_prices").select("id, min_pages, max_pages, price").order("min_pages");
  if (error) throw new Error("Could not load binding prices");
  return (data ?? []).map((r) => ({ ...r, price: Number(r.price) }));
});

export const saveBinding = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid().optional(), range: bindingRangeSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    requireAdminAccess(allowed);
    const { data: others } = await context.supabase.from("binding_prices").select("id, min_pages, max_pages");
    if ((others ?? []).some((o) => o.id !== data.id && data.range.min_pages <= o.max_pages && data.range.max_pages >= o.min_pages)) throw new Error("This page range overlaps an existing range.");
    const { error } = data.id
      ? await context.supabase.from("binding_prices").update(data.range).eq("id", data.id)
      : await context.supabase.from("binding_prices").insert(data.range);
    if (error) throw new Error("Could not save binding price");
    return { ok: true };
  });

export const deleteBinding = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    requireAdminAccess(allowed);
    const { error } = await context.supabase.from("binding_prices").delete().eq("id", data.id);
    if (error) throw new Error("Could not delete binding price");
    return { ok: true };
  });
