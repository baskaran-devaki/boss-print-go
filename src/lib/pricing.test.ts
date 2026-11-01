import { describe, expect, it } from "vitest";
import { calculatePrice, pricingSchema, quoteSchema, requireAdminAccess, type Pricing } from "./pricing";

const printout: Pricing = { id: "p", service: "printout", paper_size: "A4", color_mode: "bw", standard_rate: 3, bulk_rate: 2, bulk_threshold: 50, available: true };
const cheap: Pricing = { ...printout, standard_rate: 1, bulk_rate: 0.75 };

describe("service pricing", () => {
  it("allows admin pricing management only after a true server role result", () => {
    expect(() => requireAdminAccess(true)).not.toThrow();
    for (const result of [false, null, undefined, "admin", "true", 1]) expect(() => requireAdminAccess(result)).toThrow("Admin access required");
  });
  it("charges Printout ₹3 at 49 sides", () => expect(calculatePrice(printout, 49, 1)).toEqual({ sides: 49, rate: 3, amount: 147 }));
  it("charges Printout ₹2 from exactly 50 sides", () => expect(calculatePrice(printout, 10, 5)).toEqual({ sides: 50, rate: 2, amount: 100 }));
  it("retains fractional rupees", () => expect(calculatePrice(cheap, 51, 1).amount).toBe(38.25));
  it("uses admin-edited threshold and rates", () => expect(calculatePrice({ ...printout, bulk_threshold: 20, bulk_rate: 0.5 }, 10, 2).amount).toBe(10));
  it("rejects unavailable services", () => expect(() => calculatePrice({ ...printout, available: false }, 50, 1)).toThrow("unavailable"));
  it("accepts only the PRINTOUT service", () => {
    expect(pricingSchema.safeParse({ ...printout, service: "printout" }).success).toBe(true);
    expect(pricingSchema.safeParse({ ...printout, service: "xerox" }).success).toBe(false);
    expect(quoteSchema.safeParse({ service: "xerox", paperSize: "A4", colorMode: "bw", pages: 25, copies: 2 }).success).toBe(false);
  });
  it("validates rates and thresholds", () => {
    expect(pricingSchema.safeParse({ ...printout, standard_rate: -1 }).success).toBe(false);
    expect(pricingSchema.safeParse({ ...printout, bulk_threshold: 0 }).success).toBe(false);
  });
  it("validates automatic page and copies values on checkout", () => {
    const input = { service: "printout", paperSize: "A4", colorMode: "bw", pages: 25, copies: 2 };
    expect(quoteSchema.parse(input).copies).toBe(2);
    expect(quoteSchema.safeParse({ ...input, copies: 0 }).success).toBe(false);
    expect(quoteSchema.safeParse({ ...input, pages: 1.5 }).success).toBe(false);
    expect(quoteSchema.parse({ ...input, amount: 0 })).not.toHaveProperty("amount");
  });
});
