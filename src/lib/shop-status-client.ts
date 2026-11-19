export type ShopStatus = { isOpen: boolean; closureReason: string; reopensAt: string | null };
export const SHOP_STATUS_TIMEOUT_MS = 8000;

// Bypass the auth-attacher/getSession middleware for this public read.
export async function requestShopStatus(signal?: AbortSignal): Promise<ShopStatus> {
  const controller = new AbortController();
  const cancelled = () => controller.abort();
  if (signal?.aborted) cancelled();
  else signal?.addEventListener("abort", cancelled, { once: true });
  const timeout = setTimeout(() => controller.abort(), SHOP_STATUS_TIMEOUT_MS);
  try {
    const response = await fetch("/api/shop-status", { cache: "no-store", credentials: "same-origin", signal: controller.signal });
    if (!response.ok) throw new Error("Could not check shop status. Please retry.");
    const data: unknown = await response.json();
    if (!data || typeof data !== "object" || !("isOpen" in data) || typeof data.isOpen !== "boolean") throw new Error("Invalid shop status response.");
    const row = data as Record<string, unknown>;
    return { isOpen: data.isOpen, closureReason: typeof row["closureReason"] === "string" ? row["closureReason"] : "", reopensAt: typeof row["reopensAt"] === "string" ? row["reopensAt"] : null };
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Shop status timed out. Check your connection and retry.");
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", cancelled);
  }
}
