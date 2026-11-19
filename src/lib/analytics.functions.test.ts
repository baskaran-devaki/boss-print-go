import { describe, expect, it, vi } from "vitest";
vi.mock("@tanstack/react-start", () => ({ createServerFn: () => { const c = { middleware: () => c, inputValidator: () => c, handler: (fn: unknown) => fn }; return c; } }));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import { getAdminAnalytics } from "./analytics.functions";
const run = getAdminAnalytics as unknown as (a: { data: { start: string; end: string; year: number }; context: unknown }) => Promise<any>;
function context(allowed = true, fail = false) {
  const selected: string[] = [], ranges: number[] = [];
  const fixture = { created_at: "2026-11-18T18:30:00Z", payment_status: "verified", payment_provider: "razorpay", razorpay_payment_id: "pay_x", total_amount: 1, subtotal_amount: 1, platform_fee_amount: 0, binding_amount: 0, spiral_binding: false, copies: 1, total_sides: 1, paper_size: "A4", color_mode: "bw", order_status: "ready" };
  const from = vi.fn(() => { const q = {
    select: (cols: string, options?: unknown) => { selected.push(cols); return options ? Promise.resolve({ count: 501, error: null, ...{} }) as any : q; },
    eq: () => q, or: () => q, gte: () => q, lt: () => q, order: () => q,
    range: async (start: number) => { ranges.push(start); return { data: Array.from({ length: start === 0 ? 500 : 1 }, () => fixture), error: fail ? new Error("db") : null }; },
  }; return q; });
  // Head-only query remains chainable until awaited.
  const head = { eq: () => head, or: () => head, then: (ok: (v: unknown) => unknown) => Promise.resolve({ count: 501, error: null }).then(ok) };
  const wrappedFrom = vi.fn(() => { const q = from(); const original = q.select; q.select = ((cols: string, options?: unknown) => options ? head : original(cols)) as typeof q.select; return q; });
  return { context: { userId: "admin", supabase: { rpc: async () => ({ data: allowed, error: null }), from: wrappedFrom } }, selected, ranges, from: wrappedFrom };
}
describe("admin analytics server", () => {
  it("requires independent admin role before any order query", async () => { const c = context(false); await expect(run({ context: c.context, data: { start: "2026-11-19", end: "2026-11-19", year: 2026 } })).rejects.toThrow(); expect(c.from).not.toHaveBeenCalled(); });
  it("paginates beyond 200/500 rows and returns aggregates without private files/customer details", async () => { const c = context(); const d = await run({ context: c.context, data: { start: "2026-11-19", end: "2026-11-19", year: 2026 } }); expect(d.report.totals.orders).toBe(501); expect(d.report.totals.total).toBe(501); expect(c.ranges).toContain(500); expect(c.selected.every(s => !s.includes("customer") && !s.includes("file") && s !== "*")).toBe(true); });
  it("does not report partial income if a database page fails", async () => { const c = context(true, true); await expect(run({ context: c.context, data: { start: "2026-11-19", end: "2026-11-19", year: 2026 } })).rejects.toThrow("Could not load income"); });
});
