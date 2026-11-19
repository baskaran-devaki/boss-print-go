import { describe, expect, it } from "vitest";
import { pickupCutoff, uploadsExpired } from "./order-retention";
const pickup = "2026-11-19T10:30:00.000Z";
describe("24-hour pickup retention", () => {
  it("uses pickup time and keeps uncollected orders regardless of their age", () => {
    expect(uploadsExpired({ picked_up_at: null }, Date.parse("2030-01-01T00:00:00Z"))).toBe(false);
  });
  it("expires exactly 24 elapsed hours after pickup", () => {
    const deadline = Date.parse(pickup) + 86400000;
    expect(uploadsExpired({ picked_up_at: pickup }, deadline - 1)).toBe(false);
    expect(uploadsExpired({ picked_up_at: pickup }, deadline)).toBe(true);
    expect(pickupCutoff(deadline)).toBe(pickup);
  });
  it("respects timezone offsets and fails closed for corrupt timestamps", () => {
    const now = Date.parse("2026-11-20T16:00:00+05:30");
    expect(uploadsExpired({ picked_up_at: "2026-11-19T16:00:00+05:30" }, now)).toBe(true);
    expect(uploadsExpired({ picked_up_at: "invalid" }, now)).toBe(true);
    expect(uploadsExpired({ files_deleted_at: pickup }, now)).toBe(true);
  });
});
