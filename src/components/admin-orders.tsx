import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronDown, ChevronUp, LoaderCircle, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAdminOrders, getOrderFileUrls, updateOrder } from "@/lib/orders.functions";
import { ORDER_STATUSES, type OrderSummary } from "@/lib/orders";
import { useLang } from "@/lib/i18n";

export function AdminOrders() {
  const { t } = useLang();
  const client = useQueryClient();
  const fetchOrders = useServerFn(getAdminOrders);
  const patchOrder = useServerFn(updateOrder);
  const fetchUrls = useServerFn(getOrderFileUrls);
  const query = useQuery({ queryKey: ["admin-orders"], queryFn: () => fetchOrders() });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [fileLinks, setFileLinks] = useState<{ path: string; url: string }[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function patch(id: string, changes: { paymentStatus?: string; orderStatus?: string }) {
    setBusyId(id); setError("");
    try {
      await patchOrder({ data: { id, ...changes } });
      await client.invalidateQueries({ queryKey: ["admin-orders"] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the order");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleFiles(order: OrderSummary) {
    if (expanded === order.id) { setExpanded(null); return; }
    setExpanded(order.id); setFilesLoading(true); setFileLinks([]); setError("");
    const paths = [...order.filePaths, ...(order.screenshotPath ? [order.screenshotPath] : [])];
    try {
      setFileLinks(await fetchUrls({ data: { paths } }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open the files");
    } finally {
      setFilesLoading(false);
    }
  }

  function statusIndex(status: string) {
    return Math.max(0, ORDER_STATUSES.indexOf(status as (typeof ORDER_STATUSES)[number]));
  }
  function paymentBadge(status: string) {
    if (status === "verified") return { label: t.paymentVerified, cls: "bg-primary/10 text-primary" };
    if (status === "rejected") return { label: t.paymentRejected, cls: "bg-destructive/10 text-destructive" };
    return { label: t.paymentPending, cls: "bg-accent text-primary" };
  }

  if (query.isPending) return <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" />{t.loadingOrders}</p>;
  if (query.error) return <p role="alert" className="text-sm text-destructive">{query.error.message}</p>;
  const orders = query.data ?? [];
  if (orders.length === 0) return <p className="text-muted-foreground">{t.noOrders}</p>;

  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-semibold">{t.orders}</h2>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="card-pg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr><th className="py-3 pr-3">ID</th><th className="pr-3">{t.customer}</th><th className="pr-3">{t.settings}</th><th className="pr-3">{t.amount}</th><th className="pr-3">UTR</th><th className="pr-3">{t.paymentCol}</th><th className="pr-3">{t.orderStatusCol}</th><th><span className="sr-only">{t.filesCol}</span></th></tr>
          </thead>
          <tbody>
            {orders.map((o) => {
              const badge = paymentBadge(o.paymentStatus);
              const next = ORDER_STATUSES[statusIndex(o.orderStatus) + 1];
              return (
                <tr key={o.id} className="border-t border-border align-top">
                  <td className="py-3 pr-3 font-medium">{o.orderCode}</td>
                  <td className="pr-3">{o.customerName}<p className="text-xs text-muted-foreground">{o.mobile ?? "—"}</p></td>
                  <td className="pr-3">{o.service.toUpperCase()}<p className="text-xs text-muted-foreground">{o.paperSize} · {o.colorMode === "bw" ? t.bw : t.colorful} · {o.pages}×{o.copies} = {o.totalSides}</p></td>
                  <td className="pr-3 font-semibold">₹{o.totalAmount.toFixed(2)}</td>
                  <td className="pr-3 break-all">{o.utr ?? "—"}</td>
                  <td className="pr-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badge.cls}`}>{badge.label}</span>
                    <div className="mt-1 flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={busyId === o.id} title={t.verify} aria-label={`${t.verify} ${o.orderCode}`} onClick={() => void patch(o.id, { paymentStatus: "verified" })}><Check /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" disabled={busyId === o.id} title={t.reject} aria-label={`${t.reject} ${o.orderCode}`} onClick={() => void patch(o.id, { paymentStatus: "rejected" })}><X /></Button>
                    </div>
                  </td>
                  <td className="pr-3">
                    <span className="rounded-full bg-accent px-2 py-1 text-xs text-primary">{t.status[statusIndex(o.orderStatus)]}</span>
                    <Button variant="ghost" size="sm" className="mt-1 block" disabled={busyId === o.id || !next} onClick={() => next && void patch(o.id, { orderStatus: next })}>{next ? `${t.advance}: ${t.status[statusIndex(next)]}` : "—"}</Button>
                  </td>
                  <td>
                    <Button variant="ghost" size="icon" aria-expanded={expanded === o.id} aria-label={`${t.filesCol} ${o.orderCode}`} onClick={() => void toggleFiles(o)}>
                      {expanded === o.id ? <ChevronUp /> : <ChevronDown />}
                    </Button>
                    {expanded === o.id && (
                      <ul className="mt-1 min-w-40 space-y-1 text-xs">
                        {filesLoading && <li role="status" className="flex items-center gap-1 text-muted-foreground"><LoaderCircle className="h-3 w-3 animate-spin motion-reduce:animate-none" />…</li>}
                        {fileLinks.map((f) => <li key={f.path}><a href={f.url} target="_blank" rel="noreferrer" className="block max-w-48 truncate text-primary underline">{f.path.split("/").pop()}</a></li>)}
                        {!filesLoading && fileLinks.length === 0 && <li className="text-muted-foreground">—</li>}
                      </ul>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4" />{t.paymentNote}</p>
    </section>
  );
}
