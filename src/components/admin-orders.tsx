import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronDown, ChevronUp, LoaderCircle, ShieldCheck, Printer, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAdminOrders, getOrderFileUrls, updateOrder } from "@/lib/orders.functions";
import { ORDER_STATUSES, type OrderSummary } from "@/lib/orders";
import { useLang } from "@/lib/i18n";

export function AdminOrders() {
  const { t, lang } = useLang();
  const ta = lang === "ta";
  const fileRequest = useRef(0);
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
    const request = ++fileRequest.current;
    if (expanded === order.id) { setExpanded(null); return; }
    setExpanded(order.id); setFilesLoading(true); setFileLinks([]); setError("");
    const paths = [...order.filePaths, ...(order.screenshotPath ? [order.screenshotPath] : [])];
    try {
      const links = paths.length ? await fetchUrls({ data: { paths } }) : [];
      if (request === fileRequest.current) setFileLinks(links);
    } catch (err) {
      if (request === fileRequest.current) setError(err instanceof Error ? err.message : "Could not open the files");
    } finally {
      if (request === fileRequest.current) setFilesLoading(false);
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
      <div className="space-y-4">
        {orders.map((o) => {
          const badge = paymentBadge(o.paymentStatus);
          const next = ORDER_STATUSES[statusIndex(o.orderStatus) + 1];
          const details = [
            [t.service, o.service.toUpperCase()],
            [t.size, o.paperSize],
            [t.color, o.colorMode === "bw" ? t.bw : t.colorful],
            [t.sides, o.printSides === "double" ? t.double : t.single],
            [ta ? "ஒரு செட்டில் பக்கங்கள்" : "Pages per set", String(o.pages)],
            [t.copies, String(o.copies)],
          ];
          return (
            <article key={o.id} aria-label={o.orderCode} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Printer className="h-4 w-4" /></span>
                  <div className="min-w-0"><h3 className="break-words font-display font-bold text-primary">{o.orderCode}</h3>
                    <time dateTime={o.createdAt} className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString(ta ? "ta-IN" : "en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.cls}`}>{badge.label}</span>
                  <span className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-primary">{t.status[statusIndex(o.orderStatus)]}</span>
                </div>
              </div>
              <div className="grid gap-5 p-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.7fr)_minmax(0,1fr)] xl:gap-6">
                <div className="min-w-0 space-y-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.customer}</h4>
                  <p className="break-words text-lg font-semibold">{o.customerName}</p>
                  <p className="text-sm text-muted-foreground">{o.mobile ? <a href={`tel:${o.mobile}`} className="text-primary underline underline-offset-4">{o.mobile}</a> : (ta ? "மொபைல் எண் வழங்கப்படவில்லை" : "Mobile not provided")}</p>
                  <p className="text-xs text-muted-foreground">{t.filesCol}: <span className="font-semibold text-foreground">{o.filePaths.length}</span></p>
                  <Button variant="outline" size="sm" className="gap-2" aria-expanded={expanded === o.id} aria-controls={`files-${o.id}`} onClick={() => void toggleFiles(o)}>
                    <FileText className="h-4 w-4" />{t.filesCol}{expanded === o.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </div>
                <div className="min-w-0 space-y-3 border-t border-border pt-4 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.settings}</h4>
                  <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {details.map(([label, value]) => <div key={label} className="min-w-0 rounded-lg bg-muted/50 px-3 py-2"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 break-words text-sm font-semibold">{value}</dd></div>)}
                  </dl>
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-sm">
                    <span className="font-medium">{ta ? "மொத்த அச்சுப் பக்கங்கள்" : "Total printed sides"}</span><span className="font-bold tabular-nums text-primary">{o.pages} × {o.copies} = {o.totalSides}</span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="text-muted-foreground">{t.spiral}</span><span className={o.spiralBinding ? "font-semibold text-primary" : "text-muted-foreground"}>{o.spiralBinding ? `${ta ? "ஆம்" : "Yes"} · ₹${o.bindingAmount.toFixed(2)}` : (ta ? "இல்லை" : "No")}</span></div>
                </div>
                <div className="min-w-0 space-y-3 border-t border-border pt-4 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.paymentCol}</h4>
                  <dl className="space-y-2 text-sm tabular-nums">
                    <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t.subtotal}</dt><dd>₹{o.subtotalAmount.toFixed(2)}</dd></div>
                    {o.platformFeeRateBps > 0 && <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t.platformFee}</dt><dd>₹{o.platformFeeAmount.toFixed(2)}</dd></div>}
                    <div className="flex justify-between gap-2 border-t border-border pt-2"><dt className="font-semibold">{t.total}</dt><dd className="text-xl font-bold text-primary">₹{o.totalAmount.toFixed(2)}</dd></div>
                  </dl>
                  <p className="text-xs font-medium text-muted-foreground">{o.paymentProvider === "razorpay" ? "Razorpay" : (ta ? "நேரடி கட்டணம்" : "Manual payment")}</p>
                  {o.utr && <div className="text-xs"><span className="text-muted-foreground">UTR</span><p className="mt-1 break-all font-mono">{o.utr}</p></div>}
                  {o.paymentProvider !== "razorpay" && <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" disabled={busyId === o.id} aria-label={`${t.verify} ${o.orderCode}`} onClick={() => void patch(o.id, { paymentStatus: "verified" })}><Check className="h-4 w-4" />{t.verify}</Button>
                    <Button variant="outline" size="sm" disabled={busyId === o.id} aria-label={`${t.reject} ${o.orderCode}`} onClick={() => void patch(o.id, { paymentStatus: "rejected" })}><X className="h-4 w-4" />{t.reject}</Button>
                  </div>}
                  {next && <Button size="sm" className="h-auto min-h-9 w-full whitespace-normal py-2" disabled={busyId === o.id} onClick={() => void patch(o.id, { orderStatus: next })}>{busyId === o.id && <LoaderCircle className="h-4 w-4 shrink-0 animate-spin motion-reduce:animate-none" />}{t.advance}: {t.status[statusIndex(next)]}</Button>}
                </div>
              </div>
              {expanded === o.id && <div id={`files-${o.id}`} className="border-t border-border bg-muted/20 px-4 py-3">
                <h4 className="mb-2 text-sm font-semibold">{t.filesCol}</h4>
                {filesLoading ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" />{ta ? "கோப்புகள் ஏற்றப்படுகின்றன…" : "Loading files…"}</p> : <ul className="grid gap-2 sm:grid-cols-2">
                  {fileLinks.map((f, i) => <li key={f.path}><a href={f.url} target="_blank" rel="noreferrer" className="flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-primary underline underline-offset-4"><FileText className="mt-0.5 h-4 w-4 shrink-0" /><span className="min-w-0 break-all">{f.path === o.screenshotPath ? (ta ? "கட்டண ரசீது" : "Payment receipt") : `${i + 1}. ${f.path.split("/").pop()}`}</span></a></li>)}
                  {fileLinks.length === 0 && <li className="text-sm text-muted-foreground">{ta ? "கோப்புகள் கிடைக்கவில்லை அல்லது சேமிப்புக் காலம் முடிந்துவிட்டது." : "No files available, or the retention period has ended."}</li>}
                </ul>}
              </div>}
            </article>
          );
        })}
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4" />{t.paymentNote}</p>
    </section>
  );
}
