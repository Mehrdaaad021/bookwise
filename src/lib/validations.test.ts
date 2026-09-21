// src/lib/validations.test.ts
import { describe, expect, it } from "vitest";
import { isValidTransition } from "./validations";

describe("appointment status machine", () => {
  it("allows the happy-path lifecycle", () => {
    expect(isValidTransition("pending", "confirmed")).toBe(true);
    expect(isValidTransition("confirmed", "checked_in")).toBe(true);
    expect(isValidTransition("checked_in", "in_progress")).toBe(true);
    expect(isValidTransition("in_progress", "completed")).toBe(true);
  });

  it("allows cancellation from every active state", () => {
    expect(isValidTransition("pending", "cancelled")).toBe(true);
    expect(isValidTransition("confirmed", "cancelled")).toBe(true);
    expect(isValidTransition("checked_in", "cancelled")).toBe(true);
    expect(isValidTransition("in_progress", "cancelled")).toBe(true);
  });

  it("blocks cancellation from terminal states", () => {
    expect(isValidTransition("completed", "cancelled")).toBe(false);
    expect(isValidTransition("cancelled", "cancelled")).toBe(false);
    expect(isValidTransition("no_show", "cancelled")).toBe(false);
  });

  it("blocks backwards jumps", () => {
    expect(isValidTransition("completed", "pending")).toBe(false);
    expect(isValidTransition("confirmed", "pending")).toBe(false);
    expect(isValidTransition("in_progress", "checked_in")).toBe(false);
  });

  it("allows no-show only from confirmed or checked_in", () => {
    expect(isValidTransition("confirmed", "no_show")).toBe(true);
    expect(isValidTransition("checked_in", "no_show")).toBe(true);
    expect(isValidTransition("pending", "no_show")).toBe(false);
    expect(isValidTransition("completed", "no_show")).toBe(false);
  });
});