import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ single: vi.fn(), select: vi.fn(), eq: vi.fn(), abortSignal: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: () => ({ select: state.select }) } }));
import { readShopStatus } from "./shop-status.server";
beforeEach(() => {
  state.select.mockReturnValue({ eq: state.eq });
  state.eq.mockReturnValue({ abortSignal: state.abortSignal });
  state.abortSignal.mockReturnValue({ single: state.single });
});
describe("server shop availability", () => {
  it("returns only the public fields and does not treat closed as missing", async () => {
    state.single.mockResolvedValue({ data: { is_open: false, closure_reason: "Holiday", reopens_at: null, private_field: "not public" }, error: null });
    expect(await readShopStatus()).toEqual({ isOpen: false, closureReason: "Holiday", reopensAt: null });
    expect(state.select).toHaveBeenCalledWith("is_open, closure_reason, reopens_at");
    expect(state.eq).toHaveBeenCalledWith("id", true);
    expect(state.abortSignal).toHaveBeenCalledWith(expect.any(AbortSignal));
  });
  it("fails closed on a missing row, DB error, or invalid boolean", async () => {
    for (const result of [{ data: null, error: null }, { data: { is_open: true }, error: { message: "failure" } }, { data: { is_open: "true" }, error: null }]) {
      state.single.mockResolvedValue(result);
      await expect(readShopStatus()).rejects.toThrow("Could not check");
    }
  });
});
