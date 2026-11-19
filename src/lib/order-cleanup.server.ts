import type { SupabaseClient } from "@supabase/supabase-js";
import { pickupCutoff, uploadsExpired } from "./order-retention";

export async function authorizeCleanup(request: Request) {
  const secret = process.env["FILE_CLEANUP_SECRET"];
  if (!secret) return new Response("Cleanup is not configured", { status: 503 });
  const { createHash, timingSafeEqual } = await import("node:crypto");
  const hash = (value: string) => createHash("sha256").update(value).digest();
  const supplied = request.headers.get("authorization") ?? "";
  if (!timingSafeEqual(hash(supplied), hash(`Bearer ${secret}`))) return new Response("Unauthorized", { status: 401 });
  return null;
}

export async function cleanupPickedUpOrders(db: SupabaseClient, now = Date.now()) {
  const cutoff = pickupCutoff(now);
  const { data: orders, error } = await db.from("orders").select("id,picked_up_at,files_deleted_at,file_paths,screenshot_path")
    .lte("picked_up_at", cutoff).is("files_deleted_at", null).order("picked_up_at", { ascending: true }).limit(20);
  if (error) throw new Error("Could not load cleanup queue");
  let deleted = 0;
  let failed = 0;
  const started = Date.now();
  for (const order of orders ?? []) {
    if (Date.now() - started > 45000) break;
    if (!uploadsExpired(order, now)) continue;
    try {
      const paths = [...new Set([
        ...(Array.isArray(order.file_paths) ? order.file_paths : []),
        ...(order.screenshot_path ? [order.screenshot_path] : []),
      ])];
      if (paths.some(p => typeof p !== "string" || p.startsWith("/") || p.includes("..") || p.length > 300)) throw new Error("Invalid stored path");
      for (let offset = 0; offset < paths.length; offset += 1000) {
        const { error: removeError } = await db.storage.from("order-uploads").remove(paths.slice(offset, offset + 1000));
        if (removeError) throw new Error("Storage removal failed");
      }
      // Never discard retry information until all Storage API deletions succeeded.
      const { error: saveError } = await db.from("orders").update({ file_paths: [], screenshot_path: null, files_deleted_at: new Date(now).toISOString() })
        .eq("id", order.id).eq("picked_up_at", order.picked_up_at).is("files_deleted_at", null);
      if (saveError) throw new Error("Could not finish cleanup");
      deleted++;
    } catch { failed++; }
  }
  return { deleted, failed };
}
