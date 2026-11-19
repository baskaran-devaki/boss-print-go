import { calculateOrderTotal } from "@/lib/platform-fee";
import { createCheckout, verifyCheckout, checkCheckout } from "@/lib/razorpay.functions";
import { openCheckout, loadCheckout, CheckoutDismissed } from "@/lib/razorpay-checkout";
import { ShopOrderGate } from "@/components/shop-status";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getCustomerPricing } from "@/lib/pricing.functions";
import { CustomerShell, customerOptions, useCustomer } from "@/components/customer-shell";
import { useQueryClient } from "@tanstack/react-query";
import { bindingCharge, calculatePrice } from "@/lib/pricing";
import { sanitizeFileName } from "@/lib/orders";
import { Upload, Printer, User, Receipt, CreditCard, FileText, Check, X, Minus, Plus, LoaderCircle, Copy } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { detectPages, printedSides, UploadError, type PrintFile, type UploadErrorCode } from "@/lib/print-files";

const customerPricingOptions = queryOptions({ queryKey: ["customer-pricing"], queryFn: () => getCustomerPricing(), staleTime: 0 });
export const Route = createFileRoute("/")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(customerOptions),
      context.queryClient.ensureQueryData(customerPricingOptions),
    ]),
  head: () => ({
    meta: [
      { title: "BOSS PrintGo — Upload • Pay • Pickup" },
      { name: "description", content: "Upload documents, pay by UPI and pick up your prints. Fast printing for students." },
      { property: "og:title", content: "BOSS PrintGo — Upload • Pay • Pickup" },
      { property: "og:description", content: "Upload documents, pay by UPI and pick up your prints." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Card({ icon: Icon, title, children, delay = 0 }: { icon: typeof Upload; title: string; children: React.ReactNode; delay?: number }) {
  return (
    <section className="customer-section animate-rise" style={{ animationDelay: `${delay}ms` }}>
      <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-primary"><Icon className="h-5 w-5" /></span>{title}
      </h2>
      {children}
    </section>
  );
}

function Seg<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="grid grid-flow-col gap-1 rounded-xl bg-muted p-1">
      {options.map(([v, l]) => (
        <Button variant="ghost" aria-pressed={value === v} key={v} onClick={() => onChange(v)} className={`rounded-lg py-2 text-sm font-medium transition-all ${value === v ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>{l}</Button>
      ))}
    </div>
  );
}

function Index() {
  const customer = useCustomer();
  return <CustomerShell page="dashboard">{customer && <ShopOrderGate><PrintDashboard key={customer.id} /></ShopOrderGate>}</CustomerShell>;
}

function PrintDashboard() {
  const { t } = useLang();
  const customer = useCustomer();
  const client = useQueryClient();
  const pricingQuery = useSuspenseQuery(customerPricingOptions);
  const submitOrderFn = useServerFn(createCheckout);
  const verifyPayment = useServerFn(verifyCheckout);
  const checkPayment = useServerFn(checkCheckout);

  const [paymentVerified, setPaymentVerified] = useState(false);

  const service = "printout" as const;
  const [files, setFiles] = useState<PrintFile[]>([]);
  const [pending, setPending] = useState(0);
  const [errors, setErrors] = useState<{ name: string; code: UploadErrorCode }[]>([]);
  const [color, setColor] = useState<"bw" | "color">("bw");
  const [sides, setSides] = useState<"single" | "double">("single");
  const [size, setSize] = useState<"A4" | "A3" | "Legal">("A4");
  const [copies, setCopies] = useState(1);
  const [spiral, setSpiral] = useState(false);
  const name = customer?.name ?? "";
  const mobile = customer?.mobile ?? "";
  const [order, setOrder] = useState<{ orderCode: string; trackingToken: string; totalAmount: number; subtotalAmount: number; platformFeeAmount: number; platformFeeRateBps: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<"uploading" | "submitting">("submitting");
  const [submitError, setSubmitError] = useState("");
  const [copied, setCopied] = useState<"upi" | "gpay" | "link" | null>(null);
  const pages = files.reduce((sum, file) => sum + file.pages, 0);
  const totalSides = printedSides(pages, copies);
  const pricing = pricingQuery.data.rates.find((row) => row.service === service && row.paper_size === size && row.color_mode === color);
  const calculation = pricing ? calculatePrice(pricing, pages, copies) : null;
  const per = calculation?.rate;
  const binding = spiral && pages > 0 ? bindingCharge(pricingQuery.data.binding, pages, copies, sides) : null;
  const bindingMissing = spiral && pages > 0 && !binding;
  const subtotal = calculation && !bindingMissing ? (Math.round(calculation.amount * 100) + Math.round((binding?.amount ?? 0) * 100)) / 100 : undefined;
  const amounts = subtotal === undefined ? undefined : calculateOrderTotal(subtotal);
  const total = amounts?.totalAmount;
  const trackingUrl = order ? `${window.location.origin}/track?t=${order.trackingToken}` : "";
  useEffect(() => { setOrder(null); setSubmitError(""); }, [size, color, sides, pages, copies, per, spiral, total]);

  // Recovery is silent: unpaid drafts never occupy the new-order page.
  useEffect(() => {
    let checking = false;
    let disposed = false;
    const refresh = async () => {
      if (checking) return;
      checking = true;
      for (const token of pendingPayments()) {
        try {
          const result = await checkPayment({ data: { token } });
          if (result.paid) {
            rememberPayment(token, false);
            if (!disposed) void client.invalidateQueries({ queryKey: ["customer-orders"] });
          }
        } catch { /* Keep the server webhook as the recovery authority. */ }
      }
      checking = false;
    };
    void refresh();
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    const timer = window.setInterval(() => { void refresh(); }, 15000);
    return () => { disposed = true; window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [customer?.id]);

  function pendingPayments(): string[] {
    try {
      const old = localStorage.getItem(`boss-payment-${customer?.id}`);
      const stored: unknown = JSON.parse(localStorage.getItem(`boss-payment-checks-${customer?.id}`) ?? "[]");
      const tokens = Array.isArray(stored) ? stored.filter((v): v is string => typeof v === "string" && /^[a-f0-9]{48}$/.test(v)) : [];
      return Array.from(new Set([...tokens, ...(old && /^[a-f0-9]{48}$/.test(old) ? [old] : [])]));
    } catch { return []; }
  }
  function rememberPayment(token: string, keep: boolean) {
    try {
      const tokens = pendingPayments().filter((value) => value !== token);
      if (keep) tokens.push(token);
      localStorage.setItem(`boss-payment-checks-${customer?.id}`, JSON.stringify(tokens.slice(-20)));
      localStorage.removeItem(`boss-payment-${customer?.id}`);
    } catch { /* Storage can be unavailable; the webhook still confirms payment. */ }
  }
  function resetOrderForm() {
    setFiles([]); setErrors([]); setColor("bw"); setSides("single");
    setSize("A4"); setCopies(1); setSpiral(false); setOrder(null);
    setPaymentVerified(false); setSubmitError("");
  }

  async function copyText(text: string, key: "upi" | "gpay" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((current) => (current === key ? null : current)), 1500);
    } catch { /* clipboard unavailable */ }
  }

  async function submit() {
    if (!pricing || total === undefined || pages < 1 || files.length === 0 || !name.trim() || submitting) return;
    setSubmitting(true); setSubmitError("");
    let checkoutToken: string | undefined;
    try {
      await loadCheckout();
      setStage("uploading");
      const uploadToken = crypto.randomUUID();
      const paths: string[] = [];
      // Files upload straight from the browser to private storage; they never pass through our server.
      for (const [index, entry] of files.entries()) {
        const path = `${uploadToken}/${index + 1}-${sanitizeFileName(entry.file.name)}`;
        const { error } = await supabase.storage.from("order-uploads").upload(path, entry.file);
        if (error) throw new Error(t.orderSubmitError);
        paths.push(path);
      }
      setStage("submitting");
      // The server re-quotes pricing and refuses the order if the total the customer paid differs.
      const placed = await submitOrderFn({ data: {
        customerName: name.trim(), mobile: mobile.trim(), service, paperSize: size, colorMode: color, printSides: sides,
        pages, copies, spiralBinding: spiral, filePaths: paths, expectedTotal: total,
      } });
      checkoutToken = placed.trackingToken;
      rememberPayment(placed.trackingToken, true);
      const response = await openCheckout({ key: placed.key, amount: placed.amount, currency: placed.currency, order_id: placed.orderId, name: "BOSS PrintGo", prefill: { name, ...(mobile ? { contact: mobile } : {}) } });
      const result = await verifyPayment({ data: { token: placed.trackingToken, ...response } });
      if (!result.paid) throw new Error("Payment is processing. It will appear in Status after confirmation. Do not pay again.");
      setPaymentVerified(true);
      setOrder(result);
      rememberPayment(placed.trackingToken, false);
      void client.invalidateQueries({ queryKey: ["customer-orders"] });
    } catch (err) {
      if (err instanceof CheckoutDismissed) {
        if (checkoutToken) rememberPayment(checkoutToken, false);
        resetOrderForm();
        return;
      }
      setSubmitError(err instanceof Error ? err.message : t.orderSubmitError);
      await pricingQuery.refetch();
    } finally {
      setSubmitting(false);
    }
  }

  async function addFiles(selected: File[]) {
    if (!selected.length) return;
    setOrder(null);
    setErrors([]);
    setPending((count) => count + selected.length);
    // Process sequentially to avoid holding several large decoded documents at once.
    for (const file of selected) {
      try {
        const count = await detectPages(file);
        const entry = { id: crypto.randomUUID(), file, pages: count };
        setFiles((current) => [...current, entry]);
      } catch (error) {
        const code = error instanceof UploadError ? error.code : "invalid";
        setErrors((current) => [...current, { name: file.name, code }]);
      } finally {
        setPending((count) => count - 1);
      }
    }
  }

  return (
    <>
      <main aria-busy={submitting} className={`mx-auto grid max-w-5xl gap-5 px-4 md:grid-cols-2 ${submitting ? "pointer-events-none" : ""}`} inert={submitting}>
        <Card icon={Upload} title={t.upload}>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-primary/30 bg-accent/50 p-6 text-center text-sm text-muted-foreground transition hover:border-primary">
            <Upload className="h-8 w-8 text-primary" />{t.drop}
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" multiple className="hidden" onChange={(e) => {
              const selected = Array.from(e.target.files ?? []);
              e.target.value = "";
              void addFiles(selected);
            }} />
          </label>
          <ul className="mt-3 space-y-2">
            {files.map((entry) => <li key={entry.id} className="flex min-w-0 items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm">
              <FileText className="h-4 w-4 shrink-0 text-primary" />
              <div className="min-w-0 flex-1"><p className="break-all">{entry.file.name}</p><p className="text-xs text-muted-foreground">{t.pages}: {entry.pages}</p></div>
              <Button variant="ghost" size="icon" className="shrink-0" aria-label={`${t.remove}: ${entry.file.name}`} title={t.remove} onClick={() => { setFiles((current) => current.filter((f) => f.id !== entry.id)); setOrder(null); }}><X /></Button>
            </li>)}
          </ul>
          {pending > 0 && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="h-4 w-4 animate-spin motion-reduce:animate-none" />{t.detecting}</p>}
          {errors.length > 0 && <ul role="alert" className="mt-3 space-y-2 text-sm text-destructive">{errors.map((error, i) => <li key={i} className="break-words"><span className="font-medium break-all">{error.name}</span>: {t.uploadErrors[error.code]}</li>)}</ul>}
          <p className="mt-3 flex justify-between text-sm"><span className="text-muted-foreground">{t.totalPages}</span><span aria-live="polite">{pages}</span></p>
        </Card>

        <Card icon={Printer} title={t.settings} delay={60}>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">{t.color}</p>
            <Seg value={color} onChange={setColor} options={[["bw", t.bw], ["color", t.colorful]]} />
            <p className="text-muted-foreground">{t.sides}</p>
            <Seg value={sides} onChange={setSides} options={[["single", t.single], ["double", t.double]]} />
            <p className="text-muted-foreground">{t.size}</p>
            <Seg value={size} onChange={setSize} options={[["A4", "A4"], ["A3", "A3"], ["Legal", "Legal"]]} />
            <div className="flex items-center justify-between pt-1">
              <span className="text-muted-foreground">{t.copies}</span>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="btn-soft" aria-label="Decrease copies" disabled={copies === 1} onClick={() => { setCopies(Math.max(1, copies - 1)); setOrder(null); }}><Minus /></Button>
                <span className="w-6 text-center font-semibold">{copies}</span>
                <Button variant="ghost" size="icon" className="btn-soft" aria-label="Increase copies" disabled={copies >= 10000} onClick={() => { setCopies(copies + 1); setOrder(null); }}><Plus /></Button>
              </div>
            </div>
            <label className="flex items-center justify-between pt-1">
              <span className="text-muted-foreground">{t.spiral}</span>
              <Switch checked={spiral} onCheckedChange={setSpiral} aria-label={t.spiral} />
            </label>
            {bindingMissing && <p role="alert" className="text-xs text-destructive">{t.spiralNone}</p>}
          </div>
        </Card>

        <Card icon={User} title={t.details} delay={120}>
          <div className="space-y-3">
            <input required value={name} readOnly placeholder={t.name} aria-label={t.name} autoComplete="name" maxLength={100} className="input-pg" />
            <input value={mobile} readOnly placeholder={t.mobileOptional} aria-label={t.mobileOptional} inputMode="numeric" autoComplete="tel" maxLength={10} className="input-pg" />
          </div>
        </Card>

        <Card icon={Receipt} title={t.summary} delay={180}>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">{t.pages}</dt><dd>{pages}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">{t.perPage}</dt><dd>{per === undefined ? "—" : `₹${per.toFixed(2)}`}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">{t.copies}</dt><dd>× {copies}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t.printedSides}</dt><dd aria-live="polite">{totalSides}</dd></div>
            {pricing && totalSides >= pricing.bulk_threshold && <div className="text-xs text-primary">{t.bulkApplied}</div>}
            {binding && <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t.spiralPrice} (₹{binding.perSet.toFixed(2)} × {copies})</dt><dd>₹{binding.amount.toFixed(2)}</dd></div>}
            <div className="flex justify-between border-t border-border pt-3"><dt className="text-muted-foreground">{t.subtotal}</dt><dd>{amounts ? `₹${amounts.subtotalAmount.toFixed(2)}` : "—"}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t.platformFee}</dt><dd aria-live="polite">{amounts ? `₹${amounts.platformFeeAmount.toFixed(2)}` : "—"}</dd></div>
            <div className="flex justify-between border-t border-border pt-3 font-display text-2xl font-bold text-primary"><dt>{t.total}</dt><dd>{total === undefined ? "—" : `₹${total.toFixed(2)}`}</dd></div>
          </dl>
          {!pricing && <p role="alert" className="mt-3 text-sm text-destructive">{t.unavailable}</p>}
        </Card>

        <Card icon={CreditCard} title={t.payment} delay={240}>
          {order ? (
            <div className="space-y-3 text-sm">
              <p className="flex items-center gap-2 font-display text-lg font-bold text-primary"><Check className="h-5 w-5" />{t.orderPlaced}</p>
              <p className="text-muted-foreground">Payment confirmed. Your order has been placed.</p>
              <div className="rounded-xl bg-muted px-3 py-2"><p className="text-xs text-muted-foreground">{t.orderId}</p><p className="font-display text-xl font-bold">{order.orderCode}</p></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t.subtotal}</span><span>₹{order.subtotalAmount.toFixed(2)}</span></div>
              {order.platformFeeRateBps > 0 && <div className="flex justify-between"><span className="text-muted-foreground">{t.platformFee}</span><span>₹{order.platformFeeAmount.toFixed(2)}</span></div>}
              <div className="flex justify-between"><span className="text-muted-foreground">{t.total}</span><span className="font-semibold">₹{order.totalAmount.toFixed(2)}</span></div>
              <div className="flex items-center justify-between gap-2"><span className="text-muted-foreground">{t.paymentCol}</span><span className="rounded-full bg-accent px-2 py-1 text-xs font-semibold text-primary">{paymentVerified ? "Payment verified" : t.paymentPending}</span></div>
              <div className="flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2">
                <div className="min-w-0"><p className="text-xs text-muted-foreground">{t.trackingLink}</p><p className="truncate text-xs">{trackingUrl}</p></div>
                <Button variant="ghost" size="icon" className="btn-soft shrink-0" aria-label={t.copyLink} onClick={() => void copyText(trackingUrl, "link")}><Copy /></Button>
              </div>
              {copied === "link" && <p role="status" className="text-xs text-primary">{t.copied}</p>}
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Pay securely using UPI or card. Payment is confirmed automatically.</p>
              <Button
                disabled={submitting || pending > 0 || pages === 0 || files.length === 0 || !pricing || !!order || !name.trim()}
                onClick={() => void submit()}
                className="btn-primary-pg mt-3 w-full"
              >
                {submitting ? (stage === "uploading" ? t.uploadHint : t.submittingOrder) : "Pay & Place Order"}
              </Button>
              {submitError && <p role="alert" className="mt-3 text-sm text-destructive">{submitError}</p>}
            </>
          )}
        </Card>

      </main>
    </>
  );
}
