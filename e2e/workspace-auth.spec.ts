// e2e/workspace-auth.spec.ts
import { test, expect, signIn, signOut } from "./fixtures";

test.describe("Invite-only authentication", () => {
  test("stranger with arbitrary email cannot obtain a session", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Work email").fill(`stranger-${Date.now()}@evil.com`);
    await page.getByRole("button", { name: /continue with email/i }).click();

    // باید خطای invite-only ببینه، نه dashboard
    await expect(page.getByText(/access denied/i)).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test("owner can sign in and reach the dashboard", async ({ page }) => {
    await signIn(page, "owner@bookwise.demo");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /overview/i })).toBeVisible();
    await signOut(page);
  });

  test("staff sees limited navigation (no Settings / Audit)", async ({ page }) => {
    await signIn(page, "staff@bookwise.demo");
    await expect(page).toHaveURL(/\/dashboard/);

    // Operate group باید کامل باشه
    await expect(page.getByRole("link", { name: /^overview$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^calendar$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /^appointments$/i })).toBeVisible();

    // Admin group نباید باشه
    await expect(page.getByRole("link", { name: /^settings$/i })).not.toBeVisible();
    await expect(page.getByRole("link", { name: /audit log/i })).not.toBeVisible();

    await signOut(page);
  });

  test("manager can see Settings but not Audit Log (owner-only)", async ({ page }) => {
    await signIn(page, "manager@bookwise.demo");
    await expect(page).toHaveURL(/\/dashboard/);

    await expect(page.getByRole("link", { name: /^settings$/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /audit log/i })).not.toBeVisible();

    await signOut(page);
  });

  test("staff trying to reach /dashboard/settings is redirected/blocked", async ({ page }) => {
    await signIn(page, "staff@bookwise.demo");
    await page.goto("/dashboard/settings");

    // باید خطای دسترسی ببینه (نه فرم تنظیمات)
    await expect(page.getByText(/forbidden|access denied|not found/i)).toBeVisible({ timeout: 10_000 });

    await signOut(page);
  });
});