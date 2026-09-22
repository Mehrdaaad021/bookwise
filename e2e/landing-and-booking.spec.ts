// e2e/landing-and-booking.spec.ts
import { test, expect, bookDemoAppointment } from "./fixtures";

// سرور dev در اولین تست‌ها سرده؛ کامپایل اولیه Next زمان می‌بره
test.setTimeout(90_000);

test.describe("Landing page", () => {
  test("renders the product homepage with CTAs", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveTitle(/bookwise/i);
    await expect(page.getByRole("heading", { name: /appointments that/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /book a demo/i })).toBeVisible();
    await expect(page.getByRole("navigation").getByRole("link", { name: /sign in/i })).toBeVisible();
  });

  test("CTA 'Book a demo' navigates to the public booking page", async ({ page }) => {
    await page.goto("/");
    // 🎯 صبر کن hydration کامل بشه، بعد کلیک کن
    await page.waitForLoadState("networkidle");
    await page.getByRole("link", { name: /book a demo/i }).click();
    await expect(page).toHaveURL(/\/book\/demo-salon/, { timeout: 20_000 });
    await expect(page.locator("button.bk-opt").first()).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("Public booking flow", () => {
  test("customer can book from scratch and receive a manage link", async ({ page }) => {
    const ref = await bookDemoAppointment(page, `E2E-${Date.now()}`);

    const manageLink = page.getByRole("link", { name: /open manage page/i });
    await expect(manageLink).toBeVisible();

    await manageLink.click();
    await expect(page).toHaveURL(/manage\?token=/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /manage your booking/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(ref)).toBeVisible();
  });

  test("manage page shows correct booking details", async ({ page }) => {
    const ref = await bookDemoAppointment(page, `E2E-M-${Date.now()}`);

    await page.getByRole("link", { name: /open manage page/i }).click();

    await expect(page.getByText(ref)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("heading", { name: /manage your booking/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByRole("button", { name: /reschedule booking/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /cancel booking/i })).toBeVisible();
    await expect(page.getByText(/reference/i)).toBeVisible();
    await expect(page.getByText(/status/i)).toBeVisible();
  });

  test("customer can cancel a just-booked appointment", async ({ page }) => {
    await bookDemoAppointment(page, `E2E-C-${Date.now()}`);
    await page.getByRole("link", { name: /open manage page/i }).click();

    await page.getByRole("button", { name: /cancel booking/i }).click();
    await expect(page.getByText(/are you sure/i)).toBeVisible();
    await page.getByRole("button", { name: /yes, cancel/i }).click();

    await expect(page.getByText(/booking was cancelled/i)).toBeVisible({ timeout: 20_000 });
  });
});