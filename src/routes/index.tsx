import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Upload, Printer, User, Receipt, CreditCard, PackageCheck, FileText, Check, X, Minus, Plus, LoaderCircle } from "lucide-react";
import { useLang, LangToggle } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { detectPages, printedSides, UploadError, type PrintFile, type UploadErrorCode } from "@/lib/print-files";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BOSS PrintGo — Upload • Pay • Pickup" },
      { name: "description", content: "Upload documents, pay online and pick up your prints. Fast printing for students." },
      { property: "og:title", content: "BOSS PrintGo — Upload • Pay • Pickup" },
      { property: "og:description", content: "Upload documents, pay online and pick up your prints." },
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
        <button key={v} onClick={() => onChange(v)} className={`rounded-lg py-2 text-sm font-medium transition-all ${value === v ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>{l}</button>
      ))}
    </div>
  );
}

function Index() {
  const { t } = useLang();
  const [files, setFiles] = useState<PrintFile[]>([]);
  const [pending, setPending] = useState(0);
  const [errors, setErrors] = useState<{ name: string; code: UploadErrorCode }[]>([]);
  const [color, setColor] = useState<"bw" | "color">("bw");
  const [sides, setSides] = useState<"single" | "double">("single");
  const [size, setSize] = useState<"A4" | "A3">("A4");
  const [copies, setCopies] = useState(1);
  const [paid, setPaid] = useState(false);
  const pages = files.reduce((sum, file) => sum + file.pages, 0);
  const totalSides = printedSides(pages, copies);
  const per = (color === "bw" ? 1 : 5) * (size === "A3" ? 2 : 1) * (sides === "double" ? 0.8 : 1);
  const total = Math.round(totalSides * per);
  const step = paid ? 1 : 0;

  async function addFiles(selected: File[]) {
    if (!selected.length) return;
    setPaid(false);
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

      <main className="mx-auto -mt-10 grid max-w-3xl gap-4 px-4 md:grid-cols-2">
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
              <Button variant="ghost" size="icon" className="shrink-0" aria-label={`${t.remove}: ${entry.file.name}`} title={t.remove} onClick={() => { setFiles((current) => current.filter((f) => f.id !== entry.id)); setPaid(false); }}><X /></Button>
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
            <Seg value={size} onChange={setSize} options={[["A4", "A4"], ["A3", "A3"]]} />
            <div className="flex items-center justify-between pt-1">
              <span className="text-muted-foreground">{t.copies}</span>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="btn-soft" aria-label="Decrease copies" disabled={copies === 1} onClick={() => { setCopies(Math.max(1, copies - 1)); setPaid(false); }}><Minus /></Button>
                <span className="w-6 text-center font-semibold">{copies}</span>
                <Button variant="ghost" size="icon" className="btn-soft" aria-label="Increase copies" onClick={() => { setCopies(copies + 1); setPaid(false); }}><Plus /></Button>
              </div>
            </div>
          </div>
        </Card>

        <Card icon={User} title={t.details} delay={120}>
          <div className="space-y-3">
            {[t.name, t.phone, t.college].map((p) => <input key={p} placeholder={p} className="input-pg" />)}
          </div>
        </Card>

        <Card icon={Receipt} title={t.summary} delay={180}>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-muted-foreground">{t.pages}</dt><dd>{pages}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">{t.perPage}</dt><dd>₹{per.toFixed(2)}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">{t.copies}</dt><dd>× {copies}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-muted-foreground">{t.printedSides}</dt><dd aria-live="polite">{totalSides}</dd></div>
            <div className="flex justify-between border-t border-border pt-3 font-display text-2xl font-bold text-primary"><dt>{t.total}</dt><dd>₹{total}</dd></div>
          </dl>
        </Card>

        <Card icon={CreditCard} title={t.payment} delay={240}>
          <div className="mb-4 grid grid-cols-3 gap-2 text-center text-xs font-medium">
            {["UPI", "GPay", "Card"].map((m) => <div key={m} className="rounded-xl border border-border py-3">{m}</div>)}
          </div>
          <Button disabled={pending > 0 || pages === 0} onClick={() => setPaid(true)} className="btn-primary-pg w-full">{paid ? <><Check className="h-4 w-4" /> {t.paid}</> : `${t.payNow} ₹${total}`}</Button>
        </Card>

        <Card icon={PackageCheck} title={t.track} delay={300}>
          <p className="mb-3 text-xs text-muted-foreground">#BPG-2041</p>
          <ol className="space-y-3">
            {t.status.map((s, i) => (
              <li key={s} className="flex items-center gap-3 text-sm">
                <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                <span className={i <= step ? "font-medium" : "text-muted-foreground"}>{s}</span>
              </li>
            ))}
          </ol>
        </Card>
      </main>
      <p className="mt-8 text-center text-xs text-muted-foreground"><Link to="/admin" className="underline">{t.admin}</Link></p>
    </div>
  );
}
