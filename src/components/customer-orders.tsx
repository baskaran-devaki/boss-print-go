import { Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { PackageCheck, History, RefreshCw, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { getCustomerOrders } from "@/lib/customers.functions";
import { useLang } from "@/lib/i18n";
import { Button } from "./ui/button";

export const customerOrdersOptions = queryOptions({ queryKey: ["customer-orders"], queryFn: () => getCustomerOrders(), staleTime: 0, refetchInterval: 5000, refetchOnWindowFocus: true });
export function CustomerOrders({ mode }: { mode: "history" | "status" }) {
  const query = useSuspenseQuery(customerOrdersOptions);
  const { t } = useLang();
  const [link, setLink] = useState("");
  const [trackError, setTrackError] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const orders = mode === "history" ? query.data.history : query.data.active;
  const Icon = mode === "history" ? History : PackageCheck;
  return <main className="mx-auto max-w-5xl px-4">
    <div className="mb-5 flex items-start justify-between gap-3"><div><h2 className="font-display text-xl font-semibold">{mode === "history" ? t.history : t.track}</h2>{mode === "history" && <p className="mt-1 text-xs text-muted-foreground">{t.monthlyReset}</p>}</div><Button variant="outline" size="icon" aria-label={t.refresh} title={t.refresh} onClick={() => void query.refetch()}><RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} /></Button></div>
    {query.error && <p role="alert" className="mb-3 text-sm text-destructive">{query.error.message}</p>}
    {mode === "status" && <form className="mb-6 flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); let value = link.trim(); try { value = new URL(value).searchParams.get("t") ?? value; } catch { /* also accepts a private token */ } const valid = /^[a-f0-9]{48}$/.test(value); setTrackError(!valid); setToken(valid ? value : null); }}><input aria-label={t.trackInput} placeholder={t.trackInput} value={link} onChange={(e) => { setLink(e.target.value); setToken(null); }} className="input-pg min-w-0 flex-1" /><Button type="submit">{t.openTracking}</Button>{trackError && <p role="alert" className="w-full text-sm text-destructive">{t.invalidTracking}</p>}{token && <Link to="/track" search={{ t: token }} className="w-full text-sm text-primary underline">{t.trackingLink}<ArrowUpRight className="inline h-4 w-4" /></Link>}</form>}
    {orders.length === 0 ? <div className="border-y border-border py-14 text-center"><Icon className="mx-auto mb-3 h-10 w-10 text-primary" /><p className="text-sm text-muted-foreground">{mode === "history" ? t.noHistory : t.noActive}</p><Link to="/" className="mt-4 inline-block text-sm font-semibold text-primary">{t.newOrder} →</Link></div> : <div className="grid gap-3 sm:grid-cols-2">{orders.map((o) => <article key={o.order_code} className="rounded-lg border border-border bg-card p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-display font-semibold">{o.order_code}</h3><span className="text-lg font-bold text-primary">₹{Number(o.total_amount).toFixed(2)}</span></div><p className="mt-2 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })} · {o.pages} × {o.copies} · {o.total_sides} {t.printedSides}</p><p className="mt-3 text-sm font-medium">{t.status[(["received", "printing", "ready", "picked_up"] as const).indexOf(o.order_status)]}</p><p className="mt-1 text-xs text-muted-foreground">{o.payment_status === "verified" ? t.paymentVerified : o.payment_status === "rejected" ? t.paymentRejected : t.paymentPending}</p><Link to="/track" search={{ t: o.tracking_token }} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">{t.track}<ArrowUpRight className="h-4 w-4" /></Link></article>)}</div>}
  </main>;
}