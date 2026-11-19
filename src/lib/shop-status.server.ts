import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Public response is deliberately limited to shop availability, never admin/session data.
export async function readShopStatus() {
  const db = supabaseAdmin as unknown as SupabaseClient;
  const { data, error } = await db.from("shop_status")
    .select("is_open, closure_reason, reopens_at").eq("id", true)
    .abortSignal(AbortSignal.timeout(6000)).single();
  if (error || !data || typeof data.is_open !== "boolean") throw new Error("Could not check shop status. Please retry.");
  return { isOpen: data.is_open as boolean, closureReason: String(data.closure_reason ?? ""), reopensAt: (data.reopens_at ?? null) as string | null };
}
