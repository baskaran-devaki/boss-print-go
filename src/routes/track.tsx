import { createFileRoute, Link } from "@tanstack/react-router";
import { trackOrder, type TrackedOrder } from "@/lib/orders.functions";
import { ORDER_STATUSES } from "@/lib/orders";
import { useLang } from "@/lib/i18n";
import { PackageCheck, Printer } from "lucide-react";

export const Route = createFileRoute("/track")({
  validateSearch: (search: Record<string, unknown>) => ({
    t: typeof search.t === "string" && /^[a-f0-9]{48}$/.test(search.t) ? search.t : undefined,
  }),
  loader: async ({ search }): Promise<TrackedOrder | null> => {
    if (!search.t) return null;
    try {
      return await trackOrder({ data: { token: search.t } });
    } catch {
      return null;
    }
  },
  head: () => ({
    meta: [
      { title: "Track Order — BOSS PrintGo" },
      { name: "description", content: "Follow your BOSS PrintGo print order from payment verification to pickup." },
      { property: "og:title", content: "Track Order — BOSS PrintGo" },
      { property: "og:description", content: "Follow your BOSS PrintGo print order." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TrackPage,
});

function TrackPage() {
  const { t } = useLang();
  const order = Route.useLoaderData();
  const token = Route.useSearch().t;

  if (!token) {
    return (
      <div className="hero-pg grid min-h-screen place-items-center px-4">
        <div className="card-pg animate-rise max-w-sm space-y-3 text-center">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-accent text-primary"><Printer className="h-5 w-5" /></span>
          <h1 className="font-display text-xl font-bold">{t.trackTitle}</h1>
          <p className="text-sm text-muted-foreground">{t.trackHint}</p>
          <Link to="/" className="block text-primary underline">{t.home}</Link>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="hero-pg grid min-h-screen place-items-center px-4">
        <div className="card-pg animate-rise max-w-sm space-y-3 text-center">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-accent text-primary"><PackageCheck className="h-5 w-5" /></span>
          <h1 className="font-display text-xl font-bold">{t.trackTitle}</h1>
          <p role="alert" className="text-sm text-muted-foreground">{t.trackNotFound}</p>
          <Link to="/" className="block text-primary underline">{t.home}</Link>
        </div>
      </div>
    );
  }

  const step = Math.max(0, ORDER_STATUSES.indexOf(order.orderStatus));
  return (
    <div className="hero-pg grid min-h-screen place-items-center px-4">
      <div className="card-pg animate-rise w-full max-w-sm space-y-4">
        <div className="flex items-center justify-between">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-accent text-primary"><PackageCheck className="h-5 w-5" /></span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${order.paymentStatus === "rejected" ? "bg-destructive/10 text-destructive" : order.paymentStatus === "verified" ? "bg-primary/10 text-primary" : "bg-accent text-primary"}`}>
            {order.paymentStatus === "verified" ? t.paymentVerified : order.paymentStatus === "rejected" ? t.paymentRejected : t.paymentPending}
          </span>
        </div>
        <h1 className="font-display text-2xl font-bold">{t.trackTitle}</h1>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">{t.orderId}</dt><dd className="font-semibold">{order.orderCode}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">{t.total}</dt><dd className="font-semibold">₹{order.totalAmount.toFixed(2)}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">{t.pages} × {t.copies}</dt><dd>{order.pages} × {order.copies} = {order.totalSides}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">{t.orderedOn}</dt><dd>{new Date(order.createdAt).toLocaleString()}</dd></div>
        </dl>
        <ol className="space-y-3">
          {t.status.map((s, i) => (
            <li key={s} className="flex items-center gap-3 text-sm">
              <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
              <span className={i <= step ? "font-medium" : "text-muted-foreground"}>{s}</span>
            </li>
          ))}
        </ol>
        <Link to="/" className="block text-center text-xs text-muted-foreground underline">{t.home}</Link>
      </div>
    </div>
  );
}
