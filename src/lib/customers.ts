import { z } from "zod";

export const CUSTOMER_CATEGORIES = ["school_student", "college_student", "others"] as const;
export const customerEntrySchema = z.object({
  name: z.string().trim().min(1).max(100),
  mobile: z.string().trim().regex(/^([0-9]{10})?$/),
  category: z.enum(CUSTOMER_CATEGORIES),
});
export type CustomerEntry = z.infer<typeof customerEntrySchema>;
export type Customer = CustomerEntry & { id: string };
export function indiaMonthStart(now = new Date()) {
  const india = new Date(now.getTime() + 330 * 60 * 1000);
  return new Date(Date.UTC(india.getUTCFullYear(), india.getUTCMonth(), 1) - 330 * 60 * 1000).toISOString();
}