import { z } from "zod";
import { storedOrderAmounts } from "./platform-fee";

export function indiaDate(value: string | Date = new Date()) {
  return new Date(new Date(value).getTime() + 330 * 60_000).toISOString().slice(0, 10);
}
export function shiftDate(day: string, days: number) {
  return new Date(Date.parse(`${day}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}, "Choose a valid date");
export const analyticsSchema = z.object({ start: day, end: day, year: z.number().int().min(2020).max(2100) }).refine(v => v.start <= v.end && Date.parse(v.end) - Date.parse(v.start) <= 365 * 86_400_000, "Choose a date range of up to 366 days");
export function indiaBounds(start: string, end: string) {
  return { start: new Date(`${start}T00:00:00+05:30`).toISOString(), end: new Date(`${shiftDate(end, 1)}T00:00:00+05:30`).toISOString() };
}
export type AnalyticsRow = {
  created_at: string; payment_status: string; payment_provider?: string | null; razorpay_payment_id?: string | null;
  total_amount: unknown; subtotal_amount?: unknown; platform_fee_amount?: unknown; platform_fee_rate_bps?: unknown;
  binding_amount: unknown; spiral_binding: boolean; copies: number; total_sides: number; paper_size: string; color_mode: string; order_status: string;
};
export type Totals = { orders: number; total: number; print: number; binding: number; fee: number; sides: number; bindingSets: number };
export type AnalyticsReport = ReturnType<typeof summarizeOrders>;
export type AdminAnalyticsData = { report: AnalyticsReport; today: Totals; month: Totals; monthly: { date: string; total: number; orders: number }[]; pendingPickup: number; generatedAt: string; start: string; end: string; year: number };
const empty = (): Totals => ({ orders: 0, total: 0, print: 0, binding: 0, fee: 0, sides: 0, bindingSets: 0 });
export const isPaidOrder = (r: AnalyticsRow) => r.payment_status === "verified" && (r.payment_provider !== "razorpay" || !!r.razorpay_payment_id);

// All additions use integer paise, and historical snapshot amounts are never re-priced.
export function summarizeOrders(rows: AnalyticsRow[], start: string, end: string) {
  const totals = empty();
  const days = new Map<string, { date: string; total: number; orders: number }>();
  for (let d = start; d <= end; d = shiftDate(d, 1)) days.set(d, { date: d, total: 0, orders: 0 });
  const groups = new Map<string, { paper: string; color: string; orders: number; sides: number; income: number }>();
  for (const r of rows) {
    const d = indiaDate(r.created_at);
    if (!isPaidOrder(r) || d < start || d > end) continue;
    const a = storedOrderAmounts(r);
    const total = Math.round(a.totalAmount * 100), fee = Math.round(a.platformFeeAmount * 100);
    const binding = Math.round(Number(r.binding_amount ?? 0) * 100);
    const print = Math.round(a.subtotalAmount * 100) - binding;
    if (![total, fee, binding, print].every(v => Number.isSafeInteger(v) && v >= 0) || total !== print + binding + fee) throw new Error("Order amount snapshots do not reconcile. Please review the order data.");
    totals.orders++; totals.total += total; totals.print += print; totals.binding += binding; totals.fee += fee;
    totals.sides += Number(r.total_sides); totals.bindingSets += r.spiral_binding ? Number(r.copies) : 0;
    const entry = days.get(d)!; entry.total += total; entry.orders++;
    const key = `${r.paper_size}|${r.color_mode}`;
    const g = groups.get(key) ?? { paper: r.paper_size, color: r.color_mode, orders: 0, sides: 0, income: 0 };
    g.orders++; g.sides += Number(r.total_sides); g.income += print; groups.set(key, g);
  }
  const money = (n: number) => n / 100;
  return {
    totals: { ...totals, total: money(totals.total), print: money(totals.print), binding: money(totals.binding), fee: money(totals.fee) },
    daily: [...days.values()].map(d => ({ ...d, total: money(d.total) })),
    printwise: [...groups.values()].sort((a, b) => a.paper.localeCompare(b.paper) || a.color.localeCompare(b.color)).map(g => ({ ...g, income: money(g.income) })),
  };
}
export function monthlyIncome(report: AnalyticsReport, year: number) {
  return Array.from({ length: 12 }, (_, i) => {
    const date = `${year}-${String(i + 1).padStart(2, "0")}`;
    const days = report.daily.filter(d => d.date.startsWith(date));
    return { date, total: days.reduce((n, d) => n + Math.round(d.total * 100), 0) / 100, orders: days.reduce((n, d) => n + d.orders, 0) };
  });
}
