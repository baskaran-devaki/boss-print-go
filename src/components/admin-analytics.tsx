import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, RefreshCw, LoaderCircle } from "lucide-react";
import { Button } from "./ui/button";
import { useLang } from "@/lib/i18n";
import { getAdminAnalytics } from "@/lib/analytics.functions";
import { analyticsSchema, indiaDate, shiftDate } from "@/lib/analytics";

const money = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
function IncomeChart({ rows, monthly = false }: { rows: { date: string; total: number }[]; monthly?: boolean }) {
  return <div className="h-64 min-w-0" role="img" aria-label={monthly ? "Monthly gross collections chart; figures in the table below" : "Daily gross collections chart; figures in the table below"}>
    <ResponsiveContainer width="100%" height="100%"><BarChart data={rows} margin={{ top: 10, right: 10, bottom: 5, left: 5 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dce3ec" />
      <XAxis dataKey="date" tickFormatter={d => monthly ? String(d).slice(5) : String(d).slice(5)} minTickGap={24} tick={{ fontSize: 11 }} />
      <YAxis width={58} tick={{ fontSize: 11 }} tickFormatter={v => Number(v) >= 1000 ? `${Number(v) / 1000}k` : String(v)} />
      <Tooltip formatter={v => money(Number(v))} labelFormatter={v => `${v} (IST)`} />
      <Bar dataKey="total" name="Collections" fill="#1670d2" radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false} />
    </BarChart></ResponsiveContainer>
  </div>;
}
export function AdminAnalytics() {
  const { t, lang } = useLang(), ta = lang === "ta";
  const today = indiaDate(), thisMonth = `${today.slice(0, 7)}-01`;
  const [draft, setDraft] = useState({ start: thisMonth, end: today, year: Number(today.slice(0, 4)) });
  const [filter, setFilter] = useState(draft);
  const [error, setError] = useState("");
  const load = useServerFn(getAdminAnalytics);
  const query = useQuery({ queryKey: ["admin-analytics", filter], queryFn: () => load({ data: filter }), staleTime: 30_000, refetchOnWindowFocus: true });
  function apply(value = draft) {
    const checked = analyticsSchema.safeParse(value);
    if (!checked.success) { setError(ta ? "சரியான தேதிகளைத் தேர்வு செய்யுங்கள் (அதிகபட்சம் 366 நாட்கள்)." : "Choose valid dates, up to 366 days."); return; }
    setError(""); setDraft(value); setFilter(value);
  }
  function preset(kind: string) {
    let start = today, end = today;
    if (kind === "yesterday") start = end = shiftDate(today, -1);
    if (kind === "month") start = thisMonth;
    if (kind === "last") { end = shiftDate(thisMonth, -1); start = `${end.slice(0, 7)}-01`; }
    apply({ ...draft, start, end });
  }
  const data = query.data;
  const text = (en: string, tamil: string) => ta ? tamil : en;
  async function download() {
    if (!data) return;
    try { const { downloadAnalyticsPdf } = await import("@/lib/analytics-pdf"); downloadAnalyticsPdf(data); }
    catch { setError(text("Could not download PDF. Please retry.", "PDF பதிவிறக்கம் முடியவில்லை. மீண்டும் முயற்சிக்கவும்.")); }
  }
  return <section className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-display text-xl font-bold">{text("Income Analytics", "வருமான பகுப்பாய்வு")}</h2><p className="mt-1 text-xs text-muted-foreground">{text("Verified payments · Order date · India time", "உறுதிசெய்த கட்டணங்கள் · ஆர்டர் தேதி · இந்திய நேரம்")}</p></div>
      <div className="flex gap-2"><Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw className={`h-4 w-4 ${query.isFetching ? "animate-spin" : ""}`} />{text("Refresh", "புதுப்பி")}</Button><Button size="sm" disabled={!data || query.isFetching || query.isError} onClick={() => void download()}><Download className="h-4 w-4" />PDF</Button></div>
    </div>
    <form className="rounded-2xl border border-border bg-card p-4" onSubmit={e => { e.preventDefault(); apply(); }}>
      <div className="mb-3 flex flex-wrap gap-2">{([["today", "Today", "இன்று"], ["yesterday", "Yesterday", "நேற்று"], ["month", "This Month", "இந்த மாதம்"], ["last", "Last Month", "கடந்த மாதம்"]] as const).map(([key, en, tamil]) => <Button key={key} variant="outline" size="sm" type="button" onClick={() => preset(key)}>{text(en, tamil)}</Button>)}</div>
      <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="space-y-1 text-xs font-medium">{text("From date", "தொடக்க தேதி")}<input type="date" required className="input-pg block w-full" value={draft.start} onChange={e => setDraft({ ...draft, start: e.target.value })} /></label><label className="space-y-1 text-xs font-medium">{text("To date", "முடிவு தேதி")}<input type="date" required className="input-pg block w-full" value={draft.end} onChange={e => setDraft({ ...draft, end: e.target.value })} /></label><label className="space-y-1 text-xs font-medium">{text("Monthly chart year", "மாத வரைபட ஆண்டு")}<input type="number" min={2020} max={2100} required className="input-pg block w-full" value={draft.year} onChange={e => setDraft({ ...draft, year: Number(e.target.value) })} /></label><Button type="submit">{text("Apply filters", "கணக்கைக் காட்டு")}</Button></div>
    </form>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {query.isPending && <p role="status" className="flex items-center gap-2 text-sm"><LoaderCircle className="h-4 w-4 animate-spin" />{text("Loading income report…", "வருமான அறிக்கை ஏற்றப்படுகிறது…")}</p>}
    {query.isError && <p role="alert" className="text-sm text-destructive">{query.error.message}</p>}
    {data && <>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
        [text("Today Income", "இன்றைய வருமானம்"), money(data.today.total), `${data.today.orders} ${t.orders} · ${today}`],
        [text("This Month Income", "இந்த மாத வருமானம்"), money(data.month.total), `${data.month.orders} ${t.orders} · ${today.slice(0, 7)}`],
        [text("Today Paid Orders", "இன்றைய கட்டணம் செலுத்திய ஆர்டர்கள்"), String(data.today.orders), text("Verified payments only", "உறுதிசெய்த கட்டணங்கள் மட்டும்")],
        [text("Pending Pickup", "பெறப்படாத ஆர்டர்கள்"), String(data.pendingPickup), text("Ready orders · All dates", "தயாரான ஆர்டர்கள் · அனைத்து தேதிகளும்")],
      ].map(([label, value, hint]) => <div key={label} className="min-w-0 rounded-2xl border border-border bg-card p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-2 break-words font-display text-2xl font-bold text-primary tabular-nums">{value}</p><p className="mt-1 text-xs text-muted-foreground">{hint}</p></div>)}</div>
      <div className="rounded-2xl border border-border bg-card p-4"><h3 className="font-semibold">{text("Selected Period", "தேர்ந்தெடுத்த காலம்")}: {data.start} → {data.end}</h3>
        <dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[[text("Print income", "அச்சு வருமானம்"), data.report.totals.print], [t.spiral, data.report.totals.binding], [t.platformFee, data.report.totals.fee], [text("Customer paid total", "வாடிக்கையாளர் செலுத்திய மொத்தம்"), data.report.totals.total]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 text-lg font-bold tabular-nums">{money(Number(value))}</dd></div>)}</dl>
        <p className="mt-3 text-xs text-muted-foreground">{data.report.totals.orders} {t.orders} · {data.report.totals.sides} {text("printed sides", "அச்சுப் பக்கங்கள்")} · {data.report.totals.bindingSets} {text("binding sets", "பைண்டிங் செட்கள்")}</p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{text("Gross collections before refunds, Razorpay deductions and expenses. This is not net profit. Verified orders are grouped by order date, not payment/settlement date.", "Refund, Razorpay கட்டணம் மற்றும் செலவுகள் கழிப்பதற்கு முந்தைய வசூல். இது நிகர லாபம் அல்ல. உறுதிசெய்த ஆர்டர்கள் ஆர்டர் தேதி அடிப்படையில் கணக்கிடப்படுகின்றன; payment / settlement தேதி அடிப்படையில் அல்ல.")}</p>
      </div>
      <div className="grid gap-4 xl:grid-cols-2"><div className="min-w-0 rounded-2xl border border-border bg-card p-4"><h3 className="mb-3 font-semibold">{text("Daily Income", "தினசரி வருமானம்")}</h3><IncomeChart rows={data.report.daily} /><details className="mt-2 text-sm"><summary className="cursor-pointer text-primary">{text("View daily figures", "தினசரி கணக்கைப் பார்க்க")}</summary><IncomeTable rows={data.report.daily} ta={ta} /></details></div>
        <div className="min-w-0 rounded-2xl border border-border bg-card p-4"><h3 className="mb-3 font-semibold">{text("Monthly Income", "மாத வருமானம்")} · {data.year}</h3><p className="mb-1 text-xs text-muted-foreground">{text("Full selected year; independent of date range", "தேர்ந்தெடுத்த முழு ஆண்டு; தேதி வரம்பிலிருந்து தனியானது")}</p><IncomeChart rows={data.monthly} monthly /><details className="mt-2 text-sm"><summary className="cursor-pointer text-primary">{text("View monthly figures", "மாத கணக்கைப் பார்க்க")}</summary><IncomeTable rows={data.monthly} ta={ta} /></details></div></div>
      <div className="rounded-2xl border border-border bg-card p-4"><h3 className="font-semibold">{text("Printwise Income", "அச்சு வகை வாரியான வருமானம்")}</h3><p className="mt-1 text-xs text-muted-foreground">{text("Print charges only; binding and platform fee shown separately above.", "அச்சுக் கட்டணம் மட்டும்; binding மற்றும் platform fee மேலே தனியாகக் காட்டப்பட்டுள்ளன.")}</p><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b border-border text-xs text-muted-foreground"><tr>{[t.size, t.color, t.orders, text("Printed sides", "அச்சுப் பக்கங்கள்"), t.amount].map(h => <th key={h} className="px-2 py-3 font-medium">{h}</th>)}</tr></thead><tbody>{data.report.printwise.map(g => <tr key={`${g.paper}-${g.color}`} className="border-b border-border last:border-0"><td className="px-2 py-3 font-semibold">{g.paper}</td><td className="px-2 py-3">{g.color === "bw" ? t.bw : t.colorful}</td><td className="px-2 py-3 tabular-nums">{g.orders}</td><td className="px-2 py-3 tabular-nums">{g.sides}</td><td className="whitespace-nowrap px-2 py-3 font-semibold tabular-nums">{money(g.income)}</td></tr>)}{!data.report.printwise.length && <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">{text("No paid orders in this period", "இந்தக் காலத்தில் கட்டணம் செலுத்திய ஆர்டர்கள் இல்லை")}</td></tr>}</tbody></table></div></div>
      <p className="text-xs text-muted-foreground">{text("Updated", "புதுப்பிக்கப்பட்டது")}: {new Date(data.generatedAt).toLocaleString(ta ? "ta-IN" : "en-IN", { timeZone: "Asia/Kolkata" })} IST · {text("PDF report uses English labels.", "PDF அறிக்கை ஆங்கிலத்தில் கிடைக்கும்.")}</p>
    </>}
  </section>;
}
function IncomeTable({ rows, ta }: { rows: { date: string; total: number; orders: number }[]; ta: boolean }) {
  return <div className="mt-3 max-h-64 overflow-auto"><table className="w-full text-left text-xs"><thead><tr><th className="py-2">{ta ? "தேதி" : "Date"}</th><th>{ta ? "ஆர்டர்கள்" : "Orders"}</th><th className="text-right">{ta ? "வசூல்" : "Collections"}</th></tr></thead><tbody>{rows.map(r => <tr key={r.date} className="border-t border-border"><td className="py-2">{r.date}</td><td>{r.orders}</td><td className="text-right tabular-nums">{money(r.total)}</td></tr>)}</tbody></table></div>;
}
