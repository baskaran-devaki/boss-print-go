import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/razorpay-webhook")({
  server: { handlers: { POST: async ({ request }) => {
    try {
      const { webhook } = await import("@/lib/razorpay.server");
      const valid = await webhook(await request.text(), request.headers.get("x-razorpay-signature") ?? "");
      return new Response(valid ? "ok" : "Invalid signature", { status: valid ? 200 : 400 });
    } catch { return new Response("Please retry delivery", { status: 500 }); }
  } } },
});
