import { describe, it, expect } from "vitest";
import { customerEntrySchema, indiaMonthStart, indiaNextMonthStart, isCustomerSessionActive } from "./customers";
describe("customer entry", () => {
  it("requires a name", () => { expect(customerEntrySchema.safeParse({ name: " ", mobile: "", category: "others" }).success).toBe(false); });
  it("allows optional mobile and validates supplied numbers", () => {
    expect(customerEntrySchema.safeParse({ name: "Priya", mobile: "", category: "others" }).success).toBe(true);
    expect(customerEntrySchema.safeParse({ name: "Priya", mobile: "123", category: "others" }).success).toBe(false);
  });
  it("accepts exactly the three requested categories", () => {
    for (const category of ["school_student", "college_student", "others"]) expect(customerEntrySchema.safeParse({ name: "Priya", mobile: "", category }).success).toBe(true);
    expect(customerEntrySchema.safeParse({ name: "Priya", mobile: "", category: "staff" }).success).toBe(false);
  });
  it("resets history on the first at midnight India time", () => {
    expect(indiaMonthStart(new Date("2026-11-30T18:29:59Z"))).toBe("2026-10-31T18:30:00.000Z");
    expect(indiaMonthStart(new Date("2026-11-30T18:30:00Z"))).toBe("2026-11-30T18:30:00.000Z");
  });
  it("keeps a November login until December 1 midnight India time", () => {
    expect(indiaNextMonthStart(new Date("2026-11-03T03:55:00Z"))).toBe("2026-11-30T18:30:00.000Z");
    expect(indiaNextMonthStart(new Date("2026-12-31T18:30:00Z"))).toBe("2027-01-31T18:30:00.000Z");
  });
  it("automatically logs out at the first midnight, not one second before", () => {
    const expires = "2026-11-30T18:30:00.000Z";
    expect(isCustomerSessionActive(expires, new Date("2026-11-30T18:29:59Z"))).toBe(true);
    expect(isCustomerSessionActive(expires, new Date(expires))).toBe(false);
  });
  it("excludes explicitly logged-out customers from active sessions", () => {
    expect(isCustomerSessionActive(null, new Date("2026-11-03T03:55:00Z"))).toBe(false);
  });
});