import { z } from "zod";

export const PAYMENT_STATUSES = ["pending_verification", "verified", "rejected"] as const;
export const ORDER_STATUSES = ["received", "printing", "ready", "picked_up"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type OrderStatus = (typeof ORDER_STATUSES)[number];

const optionalDigits = z.preprocess(
  (value) => (typeof value === "string" ? (value.trim() === "" ? undefined : value.trim()) : value),
  z.string().regex(/^[0-9]{10}$/).optional(),
);

export const submitOrderSchema = z.object({
  customerName: z.string().trim().min(1).max(100),
  mobile: optionalDigits,
  service: z.enum(["printout"]),
  paperSize: z.enum(["A4", "A3", "Legal"]),
  colorMode: z.enum(["bw", "color"]),
  printSides: z.enum(["single", "double"]).default("single"),
  pages: z.number().int().min(1).max(100000),
  copies: z.number().int().min(1).max(10000),
  utr: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().regex(/^[A-Za-z0-9-]{4,40}$/).optional()),
  filePaths: z.array(z.string().min(1).max(300)).min(1).max(500),
  screenshotPath: z.string().min(1).max(300).optional(),
  expectedTotal: z.number().multipleOf(0.01).min(0).max(10000000),
}).refine((o) => !!o.utr || !!o.screenshotPath, { message: "Enter the UTR number or upload a payment screenshot.", path: ["utr"] });

export const trackOrderSchema = z.object({ token: z.string().regex(/^[a-f0-9]{48}$/) });

export const orderUpdateSchema = z.object({
  id: z.string().uuid(),
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  orderStatus: z.enum(ORDER_STATUSES).optional(),
});

export const paymentSettingsSchema = z.object({
  upiId: z.string().trim().min(3).max(100).regex(/^[A-Za-z0-9._-]+@[A-Za-z0-9._-]+$/),
  gpayNumber: optionalDigits,
  payeeName: z.string().trim().min(1).max(60),
  qrImage: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().startsWith("data:image/").max(500000).optional(),
  ),
});

export type SubmitOrderInput = z.infer<typeof submitOrderSchema>;
export type PaymentSettingsInput = z.infer<typeof paymentSettingsSchema>;

export type OrderSummary = {
  id: string;
  orderCode: string;
  customerName: string;
  mobile: string | null;
  service: string;
  paperSize: string;
  colorMode: string;
  printSides: "single" | "double";
  pages: number;
  copies: number;
  totalSides: number;
  totalAmount: number;
  utr: string | null;
  filePaths: string[];
  screenshotPath: string | null;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  createdAt: string;
};

export type PaymentSettings = { upiId: string; gpayNumber: string; payeeName: string; qrImage: string | null };

export type TrackedOrder = {
  orderCode: string;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  totalAmount: number;
  totalSides: number;
  pages: number;
  copies: number;
  createdAt: string;
};

export function sanitizeFileName(name: string) {
  const clean = name.replace(/[^A-Za-z0-9._-]+/g, "_");
  return clean.length > 80 ? clean.slice(-80) : clean;
}
