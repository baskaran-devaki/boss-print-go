import { createCheckout, verifyCheckout, checkCheckout, resumeCheckout } from "@/lib/razorpay.functions";
import { openCheckout, loadCheckout } from "@/lib/razorpay-checkout";
import { ShopOrderGate } from "@/components/shop-status";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getCustomerPricing } from "@/lib/pricing.functions";
import { getPaymentSettings, submitOrder } from "@/lib/orders.functions";
import { CustomerShell, customerOptions, useCustomer } from "@/components/customer-shell";
import { useQueryClient } from "@tanstack/react-query";
import { bindingCharge, calculatePrice } from "@/lib/pricing";
import { buildUpiUri, useQrDataUrl } from "@/lib/upi-qr";
import { sanitizeFileName } from "@/lib/orders";
import { Upload, Printer, User, Receipt, CreditCard, FileText, Check, X, Minus, Plus, LoaderCircle, Copy } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { detectPages, printedSides, UploadError, type PrintFile, type UploadErrorCode } from "@/lib/print-files";

const customerPricingOptions = queryOptions({ queryKey: ["customer-pricing"], queryFn: () => getCustomerPricing(), staleTime: 0 });
const paymentSettingsOptions = queryOptions({ queryKey: ["payment-settings"], queryFn: () => getPaymentSettings(), staleTime: 0 });
export const Route = createFileRoute("/")({
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(customerOptions),
      context.queryClient.ensureQueryData(customerPricingOptions),
      context.queryClient.ensureQueryData(paymentSettingsOptions),
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
  const settingsQuery = useSuspenseQuery(paymentSettingsOptions);
  const submitOrderFn = useServerFn(createCheckout);
  const verifyPayment = useServerFn(verifyCheckout);
  const checkPayment = useServerFn(checkCheckout);
  const resumePayment = useServerFn(resumeCheckout);
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [savedToken, setSavedToken] = useState<string | null>(null);
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
  const [utr, setUtr] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotError, setScreenshotError] = useState("");
  const [order, setOrder] = useState<{ orderCode: string; trackingToken: string; totalAmount: number } | null>(null);
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
  const total = calculation && !bindingMissing ? (Math.round(calculation.amount * 100) + Math.round((binding?.amount ?? 0) * 100)) / 100 : undefined;
  const settings = settingsQuery.data;
  const trackingUrl = order ? `${window.location.origin}/track?t=${order.trackingToken}` : "";
  const qr = useQrDataUrl(settings.upiId && total !== undefined ? buildUpiUri(settings.upiId, settings.payeeName, total) : "");
  useEffect(() => { setOrder(null); setSubmitError(""); }, [size, color, sides, pages, copies, per, spiral, total]);

  useEffect(() => { setSavedToken(localStorage.getItem(`boss-payment-${customer?.id}`)); }, [customer?.id]);
  useEffect(() => {
    if (!savedToken) return;
    const refresh = () => { void recoverPayment(); };
    refresh();
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [savedToken]);
  async function recoverPayment() {
    if (!savedToken) return;
    setSubmitting(true); setSubmitError("");
    try {
      const result = await checkPayment({ data: { token: savedToken } });
      if (!result.paid) { setSubmitError("Payment is not confirmed yet. Check again shortly. If money was deducted, do not pay again."); return; }
      setOrder(result); setPaymentVerified(true);
      localStorage.removeItem(`boss-payment-${customer?.id}`); setSavedToken(null);
      void client.invalidateQueries({ queryKey: ["customer-orders"] });
    } catch (e) { setSubmitError(e instanceof Error ? e.message : "Could not check payment."); }
    finally { setSubmitting(false); }
  }

  async function retryPayment() {
    if (!savedToken || submitting) return;
    setSubmitting(true); setSubmitError("");
    try {
      const prepared = await resumePayment({ data: { token: savedToken } });
      let result = prepared;
      if (!prepared.paid) {
        const response = await openCheckout({ key: prepared.key, amount: prepared.amount, currency: prepared.currency, order_id: prepared.orderId, name: "BOSS PrintGo", prefill: { name, ...(mobile ? { contact: mobile } : {}) } });
        const verified = await verifyPayment({ data: { token: savedToken, ...response } });
        result = { ...prepared, ...verified };
      }
      if (!result.paid) throw new Error("Payment is processing. Check payment status again shortly.");
      setOrder(result); setPaymentVerified(true);
      localStorage.removeItem(`boss-payment-${customer?.id}`); setSavedToken(null);
      void client.invalidateQueries({ queryKey: ["customer-orders"] });
    } catch (e) { setSubmitError(e instanceof Error ? e.message : "Payment unavailable."); }
    finally { setSubmitting(false); }
  }

  async function copyText(text: string, key: "upi" | "gpay" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((current) => (current === key ? null : current)), 1500);
    } catch { /* clipboard unavailable */ }
  }

  function chooseScreenshot(file: File | null) {
    if (!file) { setScreenshot(null); setScreenshotError(""); return; }
    if (!["image/jpeg", "image/png"].includes(file.type) || !/\.(jpe?g|png)$/i.test(file.name)) { setScreenshotError(t.screenshotType); return; }
    if (file.size > 5 * 1024 * 1024) { setScreenshotError(t.screenshotTooBig); return; }
    setScreenshotError("");
    setScreenshot(file);
  }

  async function submit() {
    if (!pricing || total === undefined || pages < 1 || files.length === 0 || !name.trim() || submitting) return;
    setSubmitting(true); setSubmitError("");
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
      localStorage.setItem(`boss-payment-${customer?.id}`, placed.trackingToken);
      setSavedToken(placed.trackingToken);
      const response = await openCheckout({ key: placed.key, amount: placed.amount, currency: placed.currency, order_id: placed.orderId, name: "BOSS PrintGo", prefill: { name, ...(mobile ? { contact: mobile } : {}) } });
      const result = await verifyPayment({ data: { token: placed.trackingToken, ...response } });
      if (!result.paid) throw new Error("Payment is processing. Use Check payment status; do not pay again.");
      setPaymentVerified(true);
      setOrder(result);
      localStorage.removeItem(`boss-payment-${customer?.id}`);
      setSavedToken(null);
      void client.invalidateQueries({ queryKey: ["customer-orders"] });
    } catch (err) {
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
              {savedToken && <Button variant="outline" className="mt-3 w-full" disabled={submitting} onClick={() => void recoverPayment()}>Check payment status</Button>}
              {savedToken && <Button variant="outline" className="mt-2 w-full" disabled={submitting} onClick={() => void retryPayment()}>Continue saved payment</Button>}
              <Button
                disabled={submitting || pending > 0 || pages === 0 || files.length === 0 || !pricing || !!order || !name.trim() || !!savedToken}
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
      <p className="mt-8 text-center text-xs text-muted-foreground"><Link to="/admin" className="underline">{t.admin}</Link></p>
    </>
  );
}
