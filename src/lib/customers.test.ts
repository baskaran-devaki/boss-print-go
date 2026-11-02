import { describe, it, expect } from "vitest";
import { customerEntrySchema, indiaMonthStart } from "./customers";
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
});