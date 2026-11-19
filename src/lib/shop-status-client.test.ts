import { afterEach, describe, expect, it, vi } from "vitest";
import { requestShopStatus, SHOP_STATUS_TIMEOUT_MS } from "./shop-status-client";
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe("public shop status request", () => {
  it("fetches live public status without an auth/session lookup and preserves closed", async () => {
    const fetcher = vi.fn(async () => Response.json({ isOpen: false, closureReason: "Holiday", reopensAt: null }));
    vi.stubGlobal("fetch", fetcher);
    expect(await requestShopStatus()).toEqual({ isOpen: false, closureReason: "Holiday", reopensAt: null });
    expect(fetcher).toHaveBeenCalledWith("/api/shop-status", expect.objectContaining({ cache: "no-store", credentials: "same-origin" }));
  });
  it("rejects service errors and malformed responses instead of declaring open", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Unavailable", { status: 503 })));
    await expect(requestShopStatus()).rejects.toThrow("Could not check");
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ isOpen: "true" })));
    await expect(requestShopStatus()).rejects.toThrow("Invalid shop status");
  });
  it("ends a stalled request after eight seconds", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    })));
    const assertion = expect(requestShopStatus()).rejects.toThrow("timed out");
    await vi.advanceTimersByTimeAsync(SHOP_STATUS_TIMEOUT_MS);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
  it("cancels the underlying fetch when the query is cancelled", async () => {
    const controller = new AbortController();
    let requestSignal: AbortSignal | null | undefined;
    vi.stubGlobal("fetch", vi.fn((_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
      requestSignal = init.signal;
      init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    })));
    const assertion = expect(requestShopStatus(controller.signal)).rejects.toThrow();
    controller.abort();
    await assertion;
    expect(requestSignal?.aborted).toBe(true);
  });
});
