import { createFileRoute } from "@tanstack/react-router";
import { CustomerShell, customerOptions } from "@/components/customer-shell";
import { CustomerOrders, customerOrdersOptions } from "@/components/customer-orders";
export const Route = createFileRoute("/status")({
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(customerOptions), context.queryClient.ensureQueryData(customerOrdersOptions)]),
  head: () => ({ meta: [{ title: "Order Status — BOSS PrintGo" }, { name: "description", content: "Track your active BOSS PrintGo print orders and payment verification." }, { property: "og:title", content: "Order Status — BOSS PrintGo" }, { property: "og:description", content: "Your print order status and pickup progress." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: () => <CustomerShell page="status"><CustomerOrders mode="status" /></CustomerShell>,
});