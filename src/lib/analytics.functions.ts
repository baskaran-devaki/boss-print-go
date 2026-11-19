import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { requireAdminAccess } from "./pricing";
import { analyticsSchema, indiaBounds, indiaDate, summarizeOrders, monthlyIncome, type AnalyticsRow, type AdminAnalyticsData } from "./analytics";

export const getAdminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(input => analyticsSchema.parse(input))
  .handler(async ({ data, context }): Promise<AdminAnalyticsData> => {
    const { data: allowed, error: roleError } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (roleError) throw new Error("Could not verify admin access");
    requireAdminAccess(allowed);
    const today = indiaDate(), monthStart = `${today.slice(0, 7)}-01`;
    const columns = "created_at,payment_status,payment_provider,razorpay_payment_id,total_amount,subtotal_amount,platform_fee_amount,platform_fee_rate_bps,binding_amount,spiral_binding,copies,total_sides,paper_size,color_mode,order_status" as const;
    async function readRange(start: string, end: string) {
      const bounds = indiaBounds(start, end);
      const rows: AnalyticsRow[] = [];
      // Read every page; the operational orders list is intentionally capped at 200.
      // 500 also stays below Supabase's default 1,000-row response cap.
      for (let offset = 0; ; offset += 500) {
        const { data: batch, error } = await context.supabase.from("orders").select(columns)
          .eq("payment_status", "verified").or("payment_provider.neq.razorpay,razorpay_payment_id.not.is.null")
          .gte("created_at", bounds.start).lt("created_at", bounds.end)
          .order("created_at", { ascending: true }).order("id", { ascending: true }).range(offset, offset + 499);
        if (error) throw new Error("Could not load income report. Please retry.");
        rows.push(...(batch ?? []) as unknown as AnalyticsRow[]);
        if (!batch || batch.length < 500) break;
      }
      return rows;
    }
    const yearStart = `${data.year}-01-01`, yearEnd = `${data.year}-12-31`;
    const [selected, yearly, current, pickup] = await Promise.all([
      readRange(data.start, data.end), readRange(yearStart, yearEnd), readRange(monthStart, today),
      context.supabase.from("orders").select("id", { count: "exact", head: true }).eq("payment_status", "verified")
        .or("payment_provider.neq.razorpay,razorpay_payment_id.not.is.null").eq("order_status", "ready"),
    ]);
    if (pickup.error) throw new Error("Could not load pickup count. Please retry.");
    return {
      report: summarizeOrders(selected, data.start, data.end), today: summarizeOrders(current, today, today).totals,
      month: summarizeOrders(current, monthStart, today).totals,
      monthly: monthlyIncome(summarizeOrders(yearly, yearStart, yearEnd), data.year),
      pendingPickup: pickup.count ?? 0, generatedAt: new Date().toISOString(), ...data,
    };
  });
