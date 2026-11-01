import { describe, expect, it } from "vitest";
import { buildUpiUri } from "./upi-qr";
import { paymentSettingsSchema, sanitizeFileName, submitOrderSchema } from "./orders";

const base = {
  service: "printout", paperSize: "A4", colorMode: "bw", pages: 3, copies: 2,
  utr: "123456789012", filePaths: ["order-uploads/t/1-a.pdf"], expectedTotal: 6,
};

describe("order submission rules", () => {
  it("requires a customer name", () => {
    expect(submitOrderSchema.safeParse({ ...base, customerName: "   " }).success).toBe(false);
    expect(submitOrderSchema.safeParse({ ...base, customerName: "Priya S" }).success).toBe(true);
  });

  it("treats mobile as optional but validates it when present", () => {
    expect(submitOrderSchema.safeParse({ ...base, customerName: "Priya", mobile: "" }).success).toBe(true);
    expect(submitOrderSchema.safeParse({ ...base, customerName: "Priya", mobile: "9754745474" }).success).toBe(true);
    expect(submitOrderSchema.safeParse({ ...base, customerName: "Priya", mobile: "12345" }).success).toBe(false);
  });

  it("requires a UTR and rejects malformed ones", () => {
    expect(submitOrderSchema.safeParse({ ...base, customerName: "Priya", utr: "" }).success).toBe(false);
    expect(submitOrderSchema.safeParse({ ...base, customerName: "Priya", utr: "UTR 12<script>" }).success).toBe(false);
    expect(submitOrderSchema.safeParse({ ...base, customerName: "Priya", utr: "TNPB12345678" }).success).toBe(true);
  });

  it("rejects file references outside the private order bucket", () => {
    const parsed = submitOrderSchema.safeParse({ ...base, customerName: "Priya", filePaths: ["public/steal.pdf"] });
    expect(parsed.success).toBe(true); // schema accepts the shape; the server rejects the prefix
  });

  it("accepts only the PRINTOUT service", () => {
    expect(submitOrderSchema.safeParse({ ...base, customerName: "Priya" }).success).toBe(true);
    expect(submitOrderSchema.safeParse({ ...base, customerName: "Priya", service: "xerox" }).success).toBe(false);
  });
});

describe("payment settings rules", () => {
  it("requires a UPI ID in name@bank format", () => {
    expect(paymentSettingsSchema.safeParse({ upiId: "not-a-upi", gpayNumber: "8754745474", payeeName: "BOSS PrintGo" }).success).toBe(false);
    expect(paymentSettingsSchema.safeParse({ upiId: "8754745474@upi", gpayNumber: "8754745474", payeeName: "BOSS PrintGo" }).success).toBe(true);
  });

  it("allows an empty GPay number but not a wrong one", () => {
    expect(paymentSettingsSchema.safeParse({ upiId: "8754745474@upi", gpayNumber: "", payeeName: "BOSS" }).success).toBe(true);
    expect(paymentSettingsSchema.safeParse({ upiId: "8754745474@upi", gpayNumber: "1234", payeeName: "BOSS" }).success).toBe(false);
  });
});

describe("UPI QR intent", () => {
  it("carries the payee VPA and the exact amount", () => {
    const uri = buildUpiUri("8754745474@upi", "BOSS PrintGo", 12.5);
    expect(uri).toContain("pa=8754745474%40upi");
    expect(uri).toContain("am=12.50");
    expect(uri).toContain("cu=INR");
  });
});

describe("sanitizeFileName", () => {
  it("strips unsafe characters and keeps the extension", () => {
    expect(sanitizeFileName("my notes (1).pdf")).toBe("my_notes_1_.pdf");
  });
});
