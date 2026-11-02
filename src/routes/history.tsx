import { createFileRoute } from "@tanstack/react-router";
import { CustomerShell, customerOptions } from "@/components/customer-shell";
import { CustomerOrders, customerOrdersOptions } from "@/components/customer-orders";
export const Route = createFileRoute("/history")({
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(customerOptions), context.queryClient.ensureQueryData(customerOrdersOptions)]),
  head: () => ({ meta: [{ title: "Monthly History — BOSS PrintGo" }, { name: "description", content: "View your BOSS PrintGo print orders for the current calendar month." }, { property: "og:title", content: "Monthly History — BOSS PrintGo" }, { property: "og:description", content: "Your current month's print orders." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }, { name: "robots", content: "noindex" }] }),
  component: () => <CustomerShell page="history"><CustomerOrders mode="history" /></CustomerShell>,
});