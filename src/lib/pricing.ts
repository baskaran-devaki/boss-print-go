import { z } from "zod";

export const pricingSchema = z.object({
  service: z.enum(["printout"]),
  paper_size: z.enum(["A4", "A3", "Legal"]),
  color_mode: z.enum(["bw", "color"]),
  standard_rate: z.number().positive().max(100000).multipleOf(0.01),
  bulk_rate: z.number().positive().max(100000).multipleOf(0.01),
  bulk_threshold: z.number().int().min(1).max(1000000),
  available: z.boolean(),
});
export type PricingInput = z.infer<typeof pricingSchema>;
export function requireAdminAccess(isAdmin: unknown) {
  if (isAdmin !== true) throw new Error("Admin access required");
}
export type Pricing = Omit<PricingInput, "service" | "paper_size" | "color_mode"> & { id: string; service: string; paper_size: string; color_mode: string };
export const quoteSchema = z.object({
  service: z.enum(["printout"]), paperSize: z.enum(["A4", "A3", "Legal"]), colorMode: z.enum(["bw", "color"]),
  pages: z.number().int().min(1).max(100000), copies: z.number().int().min(1).max(10000),
});
export function calculatePrice(pricing: Pricing, pages: number, copies: number) {
  if (!pricing.available) throw new Error("Service unavailable");
  if (!Number.isSafeInteger(pages) || pages < 0 || !Number.isSafeInteger(copies) || copies < 1) throw new Error("Invalid pages or copies");
  const sides = pages * copies;
  const rate = sides >= pricing.bulk_threshold ? pricing.bulk_rate : pricing.standard_rate;
  return { sides, rate, amount: Math.round(sides * Math.round(rate * 100)) / 100 };
}
export const bindingRangeSchema = z.object({
  min_pages: z.number().int().min(1).max(100000),
  max_pages: z.number().int().min(1).max(100000),
  price: z.number().min(0).max(100000).multipleOf(0.01),
}).refine((r) => r.max_pages >= r.min_pages, { message: "To pages must be ≥ From pages", path: ["max_pages"] });
export type BindingRange = z.infer<typeof bindingRangeSchema>;
/** Standard spiral coil sizes by sheet capacity (admin display only). */
const COIL_SIZES: [maxSheets: number, label: string][] = [
  [40, "8 mm"], [65, "10 mm"], [90, "12 mm"], [115, "14 mm"], [135, "16 mm"], [160, "19 mm"],
  [195, "22 mm"], [230, "25 mm"], [260, "28 mm"], [290, "32 mm"], [330, "38 mm"], [390, "45 mm"], [440, "50 mm"],
];
/** Suggested spiral coil size for a page count (1 page ≈ 1 sheet). */
export function coilSizeForPages(pages: number) {
  return COIL_SIZES.find(([max]) => pages <= max)?.[1] ?? "50 mm+";
}
/** Spiral binding: one bind per copy (set), price picked from the page range. Returns null if no range matches. */
export function bindingCharge(ranges: BindingRange[], pages: number, copies: number) {
  const range = [...ranges].sort((a, b) => a.min_pages - b.min_pages).find((r) => pages >= r.min_pages && pages <= r.max_pages);
  if (!range) return null;
  return { perSet: range.price, amount: (Math.round(range.price * 100) * copies) / 100 };
}
