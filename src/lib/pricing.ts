import { z } from "zod";

export const pricingSchema = z.object({
  service: z.enum(["xerox", "printout"]),
  paper_size: z.enum(["A4", "A3"]),
  color_mode: z.enum(["bw", "color"]),
  standard_rate: z.number().positive().max(100000).multipleOf(0.01),
  bulk_rate: z.number().positive().max(100000).multipleOf(0.01),
  bulk_threshold: z.number().int().min(1).max(1000000),
  available: z.boolean(),
});
export type PricingInput = z.infer<typeof pricingSchema>;
export type Pricing = Omit<PricingInput, "service" | "paper_size" | "color_mode"> & { id: string; service: string; paper_size: string; color_mode: string };
export const quoteSchema = z.object({
  service: z.enum(["xerox", "printout"]), paperSize: z.enum(["A4", "A3"]), colorMode: z.enum(["bw", "color"]),
  pages: z.number().int().min(1).max(100000), copies: z.number().int().min(1).max(10000),
});
export function calculatePrice(pricing: Pricing, pages: number, copies: number) {
  if (!pricing.available) throw new Error("Service unavailable");
  if (!Number.isSafeInteger(pages) || pages < 0 || !Number.isSafeInteger(copies) || copies < 1) throw new Error("Invalid pages or copies");
  const sides = pages * copies;
  const rate = sides >= pricing.bulk_threshold ? pricing.bulk_rate : pricing.standard_rate;
  return { sides, rate, amount: Math.round(sides * Math.round(rate * 100)) / 100 };
}