import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getCustomerPricing, validateFinalPrice } from "@/lib/pricing.functions";
import { getPaymentSettings, submitOrder } from "@/lib/orders.functions";
import { calculatePrice } from "@/lib/pricing";
import { buildUpiUri, useQrDataUrl } from "@/lib/upi-qr";
import { sanitizeFileName } from "@/lib/orders";
import { Upload, Printer, User, Receipt, CreditCard, PackageCheck, FileText, Check, X, Minus, Plus, LoaderCircle, Copy } from "lucide-react";
import { useLang, LangToggle } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { detectPages, printedSides, UploadError, type PrintFile, type UploadErrorCode } from "@/lib/print-files";

const customerPricingOptions = queryOptions({ queryKey: ["customer-pricing"], queryFn: () => getCustomerPricing(), staleTime: 0 });
const paymentSettingsOptions = queryOptions({ queryKey: ["payment-settings"], queryFn: () => getPaymentSettings(), staleTime: 0 });
export const Route = createFileRoute("/")({
  loader: ({ context }) =>
    Promise.all([
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
    <section className="card-pg animate-rise" style={{ animationDelay: `${delay}ms` }}>
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
  const { t } = useLang();
  const pricingQuery = useSuspenseQuery(customerPricingOptions);
  const settingsQuery = useSuspenseQuery(paymentSettingsOptions);
  const submitOrderFn = useServerFn(submitOrder);
  const [service, setService] = useState<"xerox" | "printout">("xerox");
  const [files, setFiles] = useState<PrintFile[]>([]);
  const [pending, setPending] = useState(0);
  const [errors, setErrors] = useState<{ name: string; code: UploadErrorCode }[]>([]);
  const [color, setColor] = useState<"bw" | "color">("bw");
  const [sides, setSides] = useState<"single" | "double">("single");
  const [size, setSize] = useState<"A4" | "A3">("A4");
  const [copies, setCopies] = useState(1);
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
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
  const pricing = pricingQuery.data.find((row) => row.service === service && row.paper_size === size && row.color_mode === color);
  const calculation = pricing ? calculatePrice(pricing, pages, copies) : null;
  const per = calculation?.rate;
  const total = calculation?.amount;
  const settings = settingsQuery.data;
  const step = order ? 1 : 0;
  const trackingUrl = order ? `${window.location.origin}/track?t=${order.trackingToken}` : "";
  const qr = useQrDataUrl(settings.upiId && total !== undefined ? buildUpiUri(settings.upiId, settings.payeeName, total) : "");
  useEffect(() => { setOrder(null); setSubmitError(""); }, [service, size, color, sides, pages, copies, per]);

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
    if (!pricing || total === undefined || pages < 1 || files.length === 0 || !name.trim() || !utr.trim() || submitting) return;
    setSubmitting(true); setSubmitError("");
    try {
      setStage("uploading");
      const uploadToken = crypto.randomUUID();
      const paths: string[] = [];
      // Files upload straight from the browser to private storage; they never pass through our server.
      for (let i = 0; i < files.length; i++) {
        const path = `${uploadToken}/${i + 1}-${sanitizeFileName(files[i].file.name)}`;
        const { error } = await supabase.storage.from("order-uploads").upload(path, files[i].file);
        if (error) throw new Error(t.orderSubmitError);
        paths.push(path);
      }
      let screenshotPath: string | undefined;
      if (screenshot) {
        screenshotPath = `${uploadToken}/screenshot-${sanitizeFileName(screenshot.name)}`;
        const { error } = await supabase.storage.from("order-uploads").upload(screenshotPath, screenshot);
        if (error) throw new Error(t.orderSubmitError);
      }
      setStage("submitting");
      // The server re-quotes pricing and refuses the order if the total the customer paid differs.
      const placed = await submitOrderFn({ data: {
        customerName: name.trim(), mobile: mobile.trim(), service, paperSize: size, colorMode: color,
        pages, copies, utr: utr.trim(), filePaths: paths, screenshotPath, expectedTotal: total,
      } });
      setOrder(placed);
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
    <div className="min-h-screen bg-background pb-16">
      <header className="hero-pg px-5 pb-16 pt-6 text-primary-foreground">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-foreground/15"><Printer className="h-5 w-5" /></span>
            <div><p className="font-display text-xl font-bold leading-none">BOSS PrintGo</p><p className="text-xs opacity-80">{t.tagline}</p></div>
          </div>
          <LangToggle />
        </div>
      </header>

      <main aria-busy={submitting} className={`mx-auto -mt-10 grid max-w-3xl gap-4 px-4 md:grid-cols-2 ${submitting ? "pointer-events-none" : ""}`} inert={submitting}>
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
            <p className="text-muted-foreground">{t.service}</p>
            <Seg value={service} onChange={setService} options={[["xerox", "XEROX"], ["printout", "PRINTOUT"]]} />
            <p className="text-muted-foreground">{t.color}</p>
            <Seg value={color} onChange={setColor} options={[["bw", t.bw], ["color", t.colorful]]} />
            <p className="text-muted-foreground">{t.sides}</p>
            <Seg value={sides} onChange={setSides} options={[["single", t.single], ["double", t.double]]} />
            <p className="text-muted-foreground">{t.size}</p>
            <Seg value={size} onChange={setSize} options={[["A4", "A4"], ["A3", "A3"]]} />
            <div className="flex items-center justify-between pt-1">
              <span className="text-muted-foreground">{t.copies}</span>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="btn-soft" aria-label="Decrease copies" disabled={copies === 1} onClick={() => { setCopies(Math.max(1, copies - 1)); setOrder(null); }}><Minus /></Button>
                <span className="w-6 text-center font-semibold">{copies}</span>
                <Button variant="ghost" size="icon" className="btn-soft" aria-label="Increase copies" disabled={copies >= 10000} onClick={() => { setCopies(copies + 1); setOrder(null); }}><Plus /></Button>
              </div>
            </div>
          </div>
        </Card>

        <Card icon={User} title={t.details} delay={120}>
          <div className="space-y-3">
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder={t.name} aria-label={t.name} autoComplete="name" maxLength={100} className="input-pg" />
            <input value={mobile} onChange={(e) => setMobile(e.target.value.replace(/[^0-9]/g, ""))} placeholder={t.mobileOptional} aria-label={t.mobileOptional} inputMode="numeric" autoComplete="tel" maxLength={10} className="input-pg" />
          </div>
        </Card>

        <Card icon={Receipt} title={t.summary} delay={180}>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">{t.pages}</dt><dd>{pages}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">{t.perPage}</dt><dd>{per === undefined ? "—" : `₹${per.toFixed(2)}`}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">{t.copies}</dt><dd>× {copies}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t.printedSides}</dt><dd aria-live="polite">{totalSides}</dd></div>
            {pricing && totalSides >= pricing.bulk_threshold && <div className="text-xs text-primary">{t.bulkApplied}</div>}
            <div className="flex justify-between border-t border-border pt-3 font-display text-2xl font-bold text-primary"><dt>{t.total}</dt><dd>{total === undefined ? "—" : `₹${total.toFixed(2)}`}</dd></div>
          </dl>
          {!pricing && <p role="alert" className="mt-3 text-sm text-destructive">{t.unavailable}</p>}
        </Card>

        <Card icon={CreditCard} title={t.payment} delay={240}>
          {order ? (
            <div className="space-y-3 text-sm">
              <p className="flex items-center gap-2 font-display text-lg font-bold text-primary"><Check className="h-5 w-5" />{t.orderPlaced}</p>
              <p className="text-muted-foreground">{t.orderPlacedHint}</p>
              <div className="rounded-xl bg-muted px-3 py-2"><p className="text-xs text-muted-foreground">{t.orderId}</p><p className="font-display text-xl font-bold">{order.orderCode}</p></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{t.total}</span><span className="font-semibold">₹{order.totalAmount.toFixed(2)}</span></div>
              <div className="flex items-center justify-between gap-2"><span className="text-muted-foreground">{t.paymentCol}</span><span className="rounded-full bg-accent px-2 py-1 text-xs font-semibold text-primary">{t.paymentPending}</span></div>
              <div className="flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2">
                <div className="min-w-0"><p className="text-xs text-muted-foreground">{t.trackingLink}</p><p className="truncate text-xs">{trackingUrl}</p></div>
                <Button variant="ghost" size="icon" className="btn-soft shrink-0" aria-label={t.copyLink} onClick={() => void copyText(trackingUrl, "link")}><Copy /></Button>
              </div>
              {copied === "link" && <p role="status" className="text-xs text-primary">{t.copied}</p>}
            </div>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-3 gap-2 text-center text-xs font-medium">
                {["UPI", "GPay", "Card"].map((m) => <div key={m} className="rounded-xl border border-border py-3">{m}</div>)}
              </div>
              {settings.upiId && (
                <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2 text-sm">
                  <div className="min-w-0"><p className="text-xs text-muted-foreground">{t.upiId}</p><p className="break-all font-medium">{settings.upiId}</p></div>
                  <Button variant="ghost" size="icon" className="btn-soft shrink-0" aria-label={`${t.copy} ${t.upiId}`} onClick={() => void copyText(settings.upiId, "upi")}><Copy /></Button>
                </div>
              )}
              {settings.gpayNumber && (
                <div className="mb-2 flex items-center justify-between gap-2 rounded-xl bg-muted px-3 py-2 text-sm">
                  <div className="min-w-0"><p className="text-xs text-muted-foreground">{t.gpayNumber}</p><p className="font-medium">{settings.gpayNumber}</p></div>
                  <Button variant="ghost" size="icon" className="btn-soft shrink-0" aria-label={`${t.copy} ${t.gpayNumber}`} onClick={() => void copyText(settings.gpayNumber, "gpay")}><Copy /></Button>
                </div>
              )}
              {copied === "upi" && <p role="status" className="mb-2 text-xs text-primary">{t.copied}</p>}
              {copied === "gpay" && <p role="status" className="mb-2 text-xs text-primary">{t.copied}</p>}
              {qr && (
                <div className="mb-4 flex flex-col items-center gap-1 rounded-xl border border-border p-3">
                  <img src={qr} alt={t.scanToPay} className="h-44 w-44" />
                  <p className="text-xs text-muted-foreground">{t.scanToPay}{total !== undefined ? ` · ₹${total.toFixed(2)}` : ""}</p>
                </div>
              )}
              {settings.qrImage && <img src={settings.qrImage} alt={t.currentQr} className="mx-auto mb-4 h-40 w-40 rounded-xl border border-border object-contain" />}
              {!settings.upiId && <p role="alert" className="mb-3 text-sm text-destructive">{t.unavailable}</p>}
              <input required value={utr} onChange={(e) => setUtr(e.target.value)} placeholder={t.utrPlaceholder} aria-label={t.utr} maxLength={40} className="input-pg" />
              <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-muted-foreground">
                <Upload className="h-4 w-4 text-primary" />
                <span className="min-w-0 truncate">{screenshot ? screenshot.name : t.screenshotOptional}</span>
                <input type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; chooseScreenshot(f ?? null); }} />
              </label>
              {screenshotError && <p role="alert" className="mt-2 text-sm text-destructive">{screenshotError}</p>}
              <Button
                disabled={submitting || pending > 0 || pages === 0 || files.length === 0 || !pricing || !!order || !name.trim() || !utr.trim()}
                onClick={() => void submit()}
                className="btn-primary-pg mt-3 w-full"
              >
                {submitting ? (stage === "uploading" ? t.uploadHint : t.submittingOrder) : t.submitOrder}
              </Button>
              {submitError && <p role="alert" className="mt-3 text-sm text-destructive">{submitError}</p>}
            </>
          )}
        </Card>

        <Card icon={PackageCheck} title={t.track} delay={300}>
          {order ? (
            <>
              <p className="mb-3 text-xs text-muted-foreground">#{order.orderCode}</p>
              <ol className="space-y-3">
                {t.status.map((s, i) => (
                  <li key={s} className="flex items-center gap-3 text-sm">
                    <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                    <span className={i <= step ? "font-medium" : "text-muted-foreground"}>{s}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-3 flex items-center justify-between gap-2 text-sm"><span className="text-muted-foreground">{t.paymentCol}</span><span className="rounded-full bg-accent px-2 py-1 text-xs font-semibold text-primary">{t.paymentPending}</span></p>
              <Link to="/track" search={{ t: order.trackingToken }} className="mt-3 inline-block text-sm text-primary underline">{t.trackingLink}</Link>
            </>
          ) : (
            <>
              <p className="mb-3 text-xs text-muted-foreground">#BPG-2041</p>
              <ol className="space-y-3">
                {t.status.map((s, i) => (
                  <li key={s} className="flex items-center gap-3 text-sm">
                    <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                    <span className={i <= step ? "font-medium" : "text-muted-foreground"}>{s}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </Card>
      </main>
      <p className="mt-8 text-center text-xs text-muted-foreground"><Link to="/admin" className="underline">{t.admin}</Link></p>
    </div>
  );
}
