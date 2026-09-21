// src/lib/money.test.ts
import { describe, expect, it } from "vitest";
import { aedToFils, formatFils } from "./money";

describe("money utilities", () => {
  it("converts AED to integer fils without float drift", () => {
    expect(aedToFils(220)).toBe(22000);
    expect(aedToFils(12.5)).toBe(1250);
    expect(aedToFils(0.1 + 0.2)).toBe(30);
  });

  it("formats fils back to readable AED", () => {
    expect(formatFils(22000)).toBe("AED 220");
    expect(formatFils(1250)).toBe("AED 12.5");
    expect(formatFils(0)).toBe("AED 0");
    expect(formatFils(1299)).toBe("AED 12.99");
  });
});