import { test, expect } from "@playwright/test";

// This smoke test targets the admin preview already running at :4173
// It walks through the provisioning wizard with minimal required fields
// and asserts the success UI is shown.

test.describe("Admin Provisioning Wizard - Happy Path", () => {
  test("provisions a tenant and shows success", async ({ page }) => {
    const base = "http://localhost:4173/#/admin/tenants/provision";
    const now = Date.now();
    const name = `Playwright Test Resto ${now}`;
    const slug = `playwright-resto-${now}`;
    const ownerEmail = `owner+${now}@example.com`;

    await page.goto(base, { waitUntil: "domcontentloaded" });

    // Step 1: Basics
    await page.fill("#name", name);
    // Slug auto-generates, but set explicitly to be deterministic
    await page.fill("#slug", slug);

    await page.getByRole("button", { name: "Next" }).click();

    // Step 2: Contact & Address (optional in happy path)
    await page.getByRole("button", { name: "Next" }).click();

    // Step 3: Owner
    await page.fill("#owner-email", ownerEmail);
    await page.getByRole("button", { name: "Next" }).click();

    // Step 4: Config
    await page.getByRole("button", { name: "Next" }).click();

    // Step 5: Billing & SMS
    await page.getByRole("button", { name: "Next" }).click();

    // Step 6: Review & Submit -> Create Tenant
    const submit = page.getByRole("button", { name: "Create Tenant" });
    await expect(submit).toBeEnabled();
    await submit.click();

    // Expect success toast or success card
    await expect(
      page.getByText("Tenant Provisioned Successfully", { exact: false })
    ).toBeVisible({ timeout: 30000 });

    // Optionally navigate to the tenant detail page via the CTA
    const goToTenant = page.getByRole("button", { name: "Go to Tenant" });
    await goToTenant.click();

    // Verify URL hash has /admin/tenants/
    await expect(page).toHaveURL(/#\/admin\/tenants\//);
  });
});
