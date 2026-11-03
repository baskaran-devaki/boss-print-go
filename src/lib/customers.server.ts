import { getCookie, setResponseHeader } from "@tanstack/react-start/server";
import { isCustomerSessionActive } from "./customers";

export async function hashCustomerToken(token: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}
export async function findCustomer(requireActive = true) {
  setResponseHeader("Cache-Control", "no-store");
  if (requireActive && getCookie("bpg-customer-active") !== "1") return null;
  const token = getCookie("bpg-customer");
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("customers").select("id,name,mobile,category,login_count,session_expires_at").eq("session_hash", await hashCustomerToken(token)).maybeSingle();
  if (error) throw new Error("Could not load customer details. Please try again.");
  if (requireActive && (!data || !isCustomerSessionActive(data.session_expires_at))) return null;
  return data;
}