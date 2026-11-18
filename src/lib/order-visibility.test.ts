import { describe, expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => {
  const chain = { middleware: () => chain, inputValidator: () => chain, handler: (fn: unknown) => fn };
  return chain;
} }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import { getAdminOrders } from "./orders.functions";

describe("admin gateway order visibility", () => {
  it("filters cancelled/failed/pending gateway checkouts before the limit and preserves paid and manual orders", async () => {
    const fixtures = [
      { id: "cancelled", payment_provider: "razorpay", payment_status: "pending_verification" },
      { id: "failed", payment_provider: "razorpay", payment_status: "rejected" },
      { id: "manually-marked", payment_provider: "razorpay", payment_status: "verified", razorpay_payment_id: null },
      { id: "paid", payment_provider: "razorpay", payment_status: "verified", razorpay_payment_id: "pay_example" },
      { id: "manual", payment_provider: "manual", payment_status: "pending_verification" },
    ];
    let visible = fixtures;
    const query = {
      select: vi.fn(() => query),
      or: vi.fn((predicate: string) => {
        expect(predicate).toBe("payment_provider.neq.razorpay,and(payment_status.eq.verified,razorpay_payment_id.not.is.null)");
        visible = fixtures.filter(o => o.payment_provider !== "razorpay" || (o.payment_status === "verified" && !!o.razorpay_payment_id));
        return query;
      }),
      order: vi.fn(() => query),
      limit: vi.fn(async () => ({ data: visible, error: null })),
    };
    const supabase = { rpc: vi.fn(async () => ({ data: true })), from: vi.fn(() => query) };
    const run = getAdminOrders as unknown as (args: { context: unknown }) => Promise<{ id: string }[]>;
    const rows = await run({ context: { supabase, userId: "admin-id" } });
    expect(query.or).toHaveBeenCalledOnce();
    expect(rows.map(o => o.id)).toEqual(["paid", "manual"]);
  });
});
