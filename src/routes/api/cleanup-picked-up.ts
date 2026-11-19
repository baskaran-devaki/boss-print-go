import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/cleanup-picked-up")({
  server: { handlers: { POST: async ({ request }) => {
    const { authorizeCleanup, cleanupPickedUpOrders } = await import("@/lib/order-cleanup.server");
    const denied = await authorizeCleanup(request);
    if (denied) return denied;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const result = await cleanupPickedUpOrders(supabaseAdmin as unknown as import("@supabase/supabase-js").SupabaseClient);
      return Response.json(result, { status: result.failed ? 500 : 200, headers: { "Cache-Control": "no-store" } });
    } catch { return Response.json({ error: "Cleanup will retry on the next scheduled run" }, { status: 500 }); }
  } } },
});
