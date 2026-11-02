import { createServerFn } from "@tanstack/react-start";
import { getCookie, getRequest, setCookie, deleteCookie, setResponseHeader } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdminAccess } from "./pricing";
import { customerEntrySchema, indiaMonthStart, type Customer } from "./customers";

export const getCustomer = createServerFn({ method: "GET" }).handler(async (): Promise<Customer | null> => {
  const { findCustomer } = await import("./customers.server");
  const row = await findCustomer();
  return row ? { id: row.id, name: row.name, mobile: row.mobile ?? "", category: customerEntrySchema.shape.category.parse(row.category) } : null;
});

export const enterCustomer = createServerFn({ method: "POST" })
  .inputValidator((input) => customerEntrySchema.parse(input))
  .handler(async ({ data }): Promise<Customer> => {
    const { findCustomer, hashCustomerToken } = await import("./customers.server");
    const existing = await findCustomer(false);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let token = getCookie("bpg-customer");
    if (!existing || !token) token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("");
    const fields = { name: data.name, mobile: data.mobile || null, category: data.category, last_login_at: new Date().toISOString() };
    const query = existing
      ? supabaseAdmin.from("customers").update({ ...fields, login_count: existing.login_count + 1 }).eq("id", existing.id)
      : supabaseAdmin.from("customers").insert({ ...fields, session_hash: await hashCustomerToken(token) });
    const { data: row, error } = await query.select("id").single();
    if (error || !row) throw new Error("Could not save your details. Please try again.");
    const options = { httpOnly: true, secure: new URL(getRequest().url).protocol === "https:", sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 365 };
    setCookie("bpg-customer", token, options);
    setCookie("bpg-customer-active", "1", options);
    return { ...data, id: row.id };
  });

export const leaveCustomer = createServerFn({ method: "POST" }).handler(async () => {
  deleteCookie("bpg-customer-active", { path: "/" });
  setResponseHeader("Cache-Control", "no-store");
  return { ok: true };
});

export const getCustomerOrders = createServerFn({ method: "GET" }).handler(async () => {
  const { findCustomer } = await import("./customers.server");
  const customer = await findCustomer();
  if (!customer) return { history: [], active: [] };
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const columns = "order_code,tracking_token,payment_status,order_status,total_amount,total_sides,pages,copies,created_at" as const;
  const [history, active] = await Promise.all([
    supabaseAdmin.from("orders").select(columns).eq("customer_id", customer.id).gte("created_at", indiaMonthStart()).order("created_at", { ascending: false }),
    supabaseAdmin.from("orders").select(columns).eq("customer_id", customer.id).neq("order_status", "picked_up").order("created_at", { ascending: false }),
  ]);
  if (history.error || active.error) throw new Error("Could not load your orders. Please try again.");
  return { history: history.data ?? [], active: active.data ?? [] };
});

export const getAdminCustomers = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const { data: allowed } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  requireAdminAccess(allowed);
  const { data, error, count } = await context.supabase.from("customers").select("id,name,mobile,category,login_count,created_at,last_login_at", { count: "exact" }).order("last_login_at", { ascending: false });
  if (error) throw new Error("Could not load customers. Please try again.");
  return { customers: data ?? [], count: count ?? 0 };
});