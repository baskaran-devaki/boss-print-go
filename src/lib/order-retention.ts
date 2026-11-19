export const PICKUP_RETENTION_MS = 24 * 60 * 60 * 1000;
export function pickupCutoff(now = Date.now()) {
  return new Date(now - PICKUP_RETENTION_MS).toISOString();
}
export function uploadsExpired(order: { picked_up_at?: string | null; files_deleted_at?: string | null }, now = Date.now()) {
  if (order.files_deleted_at) return true;
  if (!order.picked_up_at) return false;
  const pickedUp = Date.parse(order.picked_up_at);
  return !Number.isFinite(pickedUp) || pickedUp + PICKUP_RETENTION_MS <= now;
}
