import { describe, it, expect } from "vitest";
import { analyticsSchema, indiaDate, indiaBounds, summarizeOrders, monthlyIncome, type AnalyticsRow, type AdminAnalyticsData } from "./analytics";
import { createAnalyticsPdf } from "./analytics-pdf";
const row = (patch: Partial<AnalyticsRow> = {}): AnalyticsRow => ({ created_at: "2026-11-18T18:30:00Z", payment_status: "verified", payment_provider: "razorpay", razorpay_payment_id: "pay_1", total_amount: 123, subtotal_amount: 120, platform_fee_amount: 3, binding_amount: 20, spiral_binding: true, copies: 2, total_sides: 100, paper_size: "A4", color_mode: "bw", order_status: "received", ...patch });
describe("income reporting", () => {
  it("uses India midnight, exclusive next-day bounds and rejects impossible/oversized ranges", () => {
    expect(indiaDate("2026-11-18T18:29:59Z")).toBe("2026-11-18");
    expect(indiaDate("2026-11-18T18:30:00Z")).toBe("2026-11-19");
    expect(indiaBounds("2026-11-19", "2026-11-19")).toEqual({ start: "2026-11-18T18:30:00.000Z", end: "2026-11-19T18:30:00.000Z" });
    expect(analyticsSchema.safeParse({ start: "2026-02-30", end: "2026-03-01", year: 2026 }).success).toBe(false);
    expect(analyticsSchema.safeParse({ start: "2025-01-01", end: "2026-12-31", year: 2026 }).success).toBe(false);
    expect(analyticsSchema.safeParse({ start: "2024-01-01", end: "2024-12-31", year: 2024 }).success).toBe(true);
  });
  it("excludes failed, cancelled and unverified gateway drafts; separates snapshots without double counting", () => {
    const r = summarizeOrders([row(), row({ payment_status: "pending_verification" }), row({ payment_status: "rejected" }), row({ razorpay_payment_id: null }), row({ created_at: "2026-11-18T18:29:59Z" })], "2026-11-19", "2026-11-20");
    expect(r.totals).toEqual({ orders: 1, total: 123, print: 100, binding: 20, fee: 3, sides: 100, bindingSets: 2 });
    expect(r.printwise[0]!.income).toBe(100);
    expect(r.daily.map(d => d.total)).toEqual([123, 0]);
  });
  it("preserves old no-fee orders and integer-paise totals across many orders", () => {
    const r = summarizeOrders([row({ payment_provider: "manual", razorpay_payment_id: null, total_amount: 0.1, subtotal_amount: undefined, platform_fee_amount: undefined, spiral_binding: false, binding_amount: 0 }), row({ total_amount: 0.2, subtotal_amount: 0.2, platform_fee_amount: 0, spiral_binding: false, binding_amount: 0 })], "2026-11-19", "2026-11-19");
    expect(r.totals.total).toBe(0.3); expect(r.totals.print).toBe(0.3); expect(r.totals.fee).toBe(0);
    expect(monthlyIncome(r, 2026)[10]).toEqual({ date: "2026-11", total: 0.3, orders: 2 });
  });
  it("fails explicitly rather than exporting inconsistent financial snapshots", () => {
    expect(() => summarizeOrders([row({ total_amount: 999 })], "2026-11-19", "2026-11-19")).toThrow("reconcile");
  });
  it("exports multipage PDF with correct xref offsets and reconciled summary", () => {
    const report = summarizeOrders([row()], "2026-01-01", "2026-12-31");
    const d: AdminAnalyticsData = { report, today: report.totals, month: report.totals, monthly: monthlyIncome(report, 2026), pendingPickup: 0, generatedAt: "2026-11-19T00:00:00Z", start: "2026-01-01", end: "2026-12-31", year: 2026 };
    const pdf = new TextDecoder().decode(createAnalyticsPdf(d));
    expect(pdf.startsWith("%PDF-1.4")).toBe(true); expect(pdf).toContain("CUSTOMER PAID TOTAL: Rs. 123.00");
    expect(pdf).toContain("2026-12-31"); expect((pdf.match(/\/Type \/Page /g) ?? []).length).toBeGreaterThan(1);
    const offset = Number(pdf.match(/startxref\n(\d+)/)![1]); expect(pdf.slice(offset, offset + 4)).toBe("xref");
    const entries = [...pdf.matchAll(/(\d{10}) 00000 n /g)];
    entries.forEach((m, i) => expect(pdf.slice(Number(m[1]))).toMatch(new RegExp(`^${i + 1} 0 obj`)));
  });
});
