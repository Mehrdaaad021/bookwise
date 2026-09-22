// e2e/fixtures.ts
import { test as base, expect, type Page } from "@playwright/test";

export const test = base.extend<{}>({});
export { expect };

/**
 * لاگین invite-only با retry.
 *
 * چرا retry؟ روی سرور dev سرد، اولین submit ممکنه با خطای MissingCSRF
 * شکست بخوره چون cookie امنیتی NextAuth هنوز ست نشده. تلاش دوم
 * cookie رو داره و موفق میشه. این الگو در تست‌های واقعی Auth.js رایجه.
 */
export async function signIn(page: Page, email: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.getByLabel("Work email").fill(email);
    await page.getByRole("button", { name: /continue with email/i }).click();
    try {
      await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
      return;
    } catch {
      // هنوز روی /login — تلاش بعدی (حالا CSRF cookie موجوده)
    }
  }
  throw new Error(`signIn failed for ${email} after 3 attempts`);
}

/**
 * لاگ‌اوت از داشبورد
 */
export async function signOut(page: Page) {
  await page.getByRole("button", { name: /sign out/i }).click();
  await page.waitForURL(/\/login/, { timeout: 15_000 });
}

/**
 * یک نوبت کامل رزرو می‌کنه از landing تا confirmation و reference رو برمی‌گردونه.
 *
 * نکات پایداری:
 * - عوض شدن step از روی heading کارت تشخیص داده میشه (نه کلاس‌های مشترک)
 * - برای پیدا کردن slot، منتظر می‌مونیم "Checking availability..." واقعاً
 *   hidden بشه (یعنی query تموم شده)، بعد تعداد slot ها شمرده میشه
 */
export async function bookDemoAppointment(page: Page, customerName: string): Promise<string> {
  await page.goto("/book/demo-salon");
  await page.waitForLoadState("networkidle");

  // Step 1: Service — اولین گزینه
  const firstService = page.locator("button.bk-opt").first();
  await expect(firstService).toBeVisible({ timeout: 20_000 });
  await firstService.click();

  // منتظر بمون step عوض بشه (Professional یا Date & Time)
  const stepHeading = page.getByRole("heading", { name: /professional|date & time/i });
  await expect(stepHeading).toBeVisible({ timeout: 15_000 });

  // Step 2: اگه staff step فعال بود، "Any Available Professional" رو انتخاب کن
  if ((await stepHeading.innerText()).match(/professional/i)) {
    await page.locator("button.bk-opt").first().click();
    await expect(page.getByRole("heading", { name: /date & time/i })).toBeVisible({ timeout: 15_000 });
  }

  // Step 3: Date — همه روزهای نمایش‌داده‌شده رو امتحان کن
  const dateButtons = page.locator("button.bk-date");
  await expect(dateButtons.first()).toBeVisible({ timeout: 15_000 });
  const dateCount = await dateButtons.count();

  const loadingEl = page.getByText("Checking availability...");
  let slotFound = false;

  for (let i = 0; i < dateCount && !slotFound; i++) {
    await dateButtons.nth(i).click();
    await page.waitForTimeout(400);

    try {
      await loadingEl.waitFor({ state: "visible", timeout: 3_000 });
    } catch {
      /* loading نیومد — جواب سریع بوده */
    }
    await expect(loadingEl).toBeHidden({ timeout: 20_000 });

    const slotCount = await page.locator("button.bk-slot").count();
    if (slotCount > 0) {
      await page.locator("button.bk-slot").first().click();
      slotFound = true;
    }
  }

  if (!slotFound) throw new Error(`No available slot in ${dateCount} days`);

  // Step 4: Details
  await expect(page.locator("form.bk-form")).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Full name").fill(customerName);
  await page.getByLabel("Email").fill(`pw-${Date.now()}@bookwise.demo`);
  await page.getByLabel("Phone").fill("+971501234567");
  await page.getByLabel(/agree to the booking policy/i).check();
  await page.getByRole("button", { name: /confirm booking/i }).click();

  // Confirmation
  await expect(page.locator(".bk-confirm")).toBeVisible({ timeout: 30_000 });

  const refText = await page.locator(".bk-confirm .sum .row").first().innerText();
  const match = refText.match(/[A-Za-z0-9_-]{6,}/);
  if (!match) throw new Error("Could not parse booking reference");
  return match[0];
}