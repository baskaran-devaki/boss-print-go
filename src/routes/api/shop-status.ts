import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/shop-status")({
  server: { handlers: { GET: async () => {
    const headers = { "Cache-Control": "no-store, max-age=0" };
    try {
      const { readShopStatus } = await import("@/lib/shop-status.server");
      return Response.json(await readShopStatus(), { headers });
    } catch { return Response.json({ error: "Could not check shop status. Please retry." }, { status: 503, headers }); }
  } } },
});
