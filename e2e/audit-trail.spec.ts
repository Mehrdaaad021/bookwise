// e2e/audit-trail.spec.ts
import { test, expect, signIn, signOut } from "./fixtures";

// لاگین + کامپایل سرد صفحات + لود audit به زمان بیشتری نیاز داره
test.setTimeout(120_000);

test.describe("Audit trail", () => {
  test("owner sees audit entries after a sensitive mutation", async ({ page }) => {
    await signIn(page, "owner@bookwise.demo");

    // 🎯 Mutation بی‌اثر و بی‌خطر: Edit اولین service و Save بدون تغییر
    // (service.updated در audit ثبت میشه بدون اینکه داده‌ای عوض بشه)
    await page.goto("/dashboard/services");
    await page.waitForLoadState("networkidle");

    const editBtn = page.getByRole("button", { name: /edit/i }).first();
    await expect(editBtn).toBeVisible({ timeout: 30_000 });
    await editBtn.click();

    await page.getByRole("button", { name: /save changes/i }).click();

    // بسته شدن drawer = نشونه موفقیت mutation
    await expect(page.getByRole("button", { name: /save changes/i })).toBeHidden({ timeout: 20_000 });

    // حالا audit log باید حداقل یک ردیف داشته باشه
    await page.goto("/dashboard/audit");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /audit log/i })).toBeVisible({ timeout: 20_000 });

    const firstRow = page.locator("tr.aud-row").first();
    await expect(firstRow).toBeVisible({ timeout: 30_000 });

    // کلیک روی ردیف → جزئیات JSON باز بشه
    await firstRow.click();
    await expect(page.locator(".aud-meta").first()).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(".aud-meta").first()).toContainText(/action|entity/i);

    await signOut(page);
  });
});