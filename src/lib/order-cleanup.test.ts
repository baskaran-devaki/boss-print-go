import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { authorizeCleanup, cleanupPickedUpOrders } from "./order-cleanup.server";
const now = Date.parse("2026-11-20T10:30:00Z");
const due = { id: "order-due", picked_up_at: "2026-11-19T10:30:00Z", files_deleted_at: null, file_paths: ["upload/a.pdf", "upload/a.pdf"], screenshot_path: "upload/receipt.png" };
function database(rows = [due], storageFails = false, saveFails = false) {
  const remove = vi.fn(async () => ({ error: storageFails ? { message: "unavailable" } : null }));
  const updateIs = vi.fn(async () => ({ error: saveFails ? { message: "unavailable" } : null }));
  const updateQuery = { eq: vi.fn(() => updateQuery), is: updateIs };
  const update = vi.fn(() => updateQuery);
  const query = { select: vi.fn(() => query), lte: vi.fn(() => query), is: vi.fn(() => query), order: vi.fn(() => query), limit: vi.fn(async () => ({ data: rows, error: null })), update };
  const db = { from: vi.fn(() => query), storage: { from: vi.fn(() => ({ remove })) } } as unknown as SupabaseClient;
  return { db, remove, update, query };
}
afterEach(() => vi.unstubAllEnvs());
describe("scheduled upload cleanup", () => {
  it("deletes print files and receipt before clearing references, without deleting the financial order", async () => {
    const { db, remove, update, query } = database();
    expect(await cleanupPickedUpOrders(db, now)).toEqual({ deleted: 1, failed: 0 });
    expect(query.lte).toHaveBeenCalledWith("picked_up_at", new Date(due.picked_up_at).toISOString());
    expect(remove).toHaveBeenCalledWith(["upload/a.pdf", "upload/receipt.png"]);
    expect(update).toHaveBeenCalledWith({ file_paths: [], screenshot_path: null, files_deleted_at: new Date(now).toISOString() });
    expect(remove.mock.invocationCallOrder[0]).toBeLessThan(update.mock.invocationCallOrder[0]!);
  });
  it("keeps references for retry when Storage fails", async () => {
    const { db, update } = database([due], true);
    expect(await cleanupPickedUpOrders(db, now)).toEqual({ deleted: 0, failed: 1 });
    expect(update).not.toHaveBeenCalled();
  });
  it("reports DB finalization failure for retry", async () => {
    const { db } = database([due], false, true);
    expect(await cleanupPickedUpOrders(db, now)).toEqual({ deleted: 0, failed: 1 });
  });
  it("does not delete an order a millisecond before its deadline", async () => {
    const { db, remove } = database();
    expect(await cleanupPickedUpOrders(db, now - 1)).toEqual({ deleted: 0, failed: 0 });
    expect(remove).not.toHaveBeenCalled();
  });
  it("requires the dedicated private scheduler secret", async () => {
    vi.stubEnv("FILE_CLEANUP_SECRET", "private-test-secret");
    expect((await authorizeCleanup(new Request("https://example.com")))?.status).toBe(401);
    expect((await authorizeCleanup(new Request("https://example.com", { headers: { authorization: "Bearer wrong" } })))?.status).toBe(401);
    expect(await authorizeCleanup(new Request("https://example.com", { headers: { authorization: "Bearer private-test-secret" } }))).toBeNull();
    vi.stubEnv("FILE_CLEANUP_SECRET", "");
    expect((await authorizeCleanup(new Request("https://example.com")))?.status).toBe(503);
  });
});
