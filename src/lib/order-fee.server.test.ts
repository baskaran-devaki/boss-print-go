import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ insert: vi.fn(), rpc: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ rpc: state.rpc }) }));
vi.mock("./customers.server", () => ({ findCustomer: async () => ({ id: "customer", name: "Student", mobile: "" }) }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  from: () => ({ insert: (fields: unknown) => {
    state.insert(fields);
    return { select: () => ({ single: async () => ({ data: { id: "order-id", order_code: "BPG-1", tracking_token: "a".repeat(48) }, error: null }) }) };
  } }),
} }));
import { createPrintOrder } from "./orders-create.server";
import { checkoutOrderSchema } from "./orders";
const input = (expectedTotal: number, spiralBinding = false) => checkoutOrderSchema.parse({ customerName: "Student", mobile: "", service: "printout", paperSize: "A4", colorMode: "bw", printSides: "double", pages: 10, copies: 1, spiralBinding, filePaths: ["upload/file.pdf"], expectedTotal });
beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "test-public");
  state.insert.mockReset();
  state.rpc.mockImplementation(async (name: string) => name === "quote_print" ? { data: [{ total_sides: 10, total_amount: 100 }], error: null } : { data: 20, error: null });
});
describe("server-quoted fee-inclusive order", () => {
  it("persists the exact fee snapshot and returns the inclusive total for Razorpay", async () => {
    const order = await createPrintOrder(input(102.5), true);
    expect(order.totalAmount).toBe(102.5);
    expect(state.insert).toHaveBeenCalledWith(expect.objectContaining({ subtotal_amount: 100, platform_fee_amount: 2.5, platform_fee_rate_bps: 250, total_amount: 102.5 }));
  });
  it("includes binding in the fee basis without changing the physical-sheet quote", async () => {
    const order = await createPrintOrder(input(123, true), true);
    expect(state.rpc).toHaveBeenCalledWith("quote_binding", { _pages: 5 });
    expect(order).toMatchObject({ subtotalAmount: 120, platformFeeAmount: 3, totalAmount: 123 });
  });
  it("rejects a browser attempting to pay only the subtotal", async () => {
    await expect(createPrintOrder(input(100), true)).rejects.toThrow("Price changed");
    expect(state.insert).not.toHaveBeenCalled();
  });
  it("preserves the legacy manual-receipt path without a retrospective fee", async () => {
    expect(await createPrintOrder(input(100), false)).toMatchObject({ subtotalAmount: 100, platformFeeAmount: 0, platformFeeRateBps: 0, totalAmount: 100 });
  });
});
