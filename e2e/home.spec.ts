import { test, expect } from "@playwright/test";

test("home page loads with brand", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Monopoly/i })).toBeVisible();
  await expect(page.getByText(/Create Private Room/i)).toBeVisible();
});

test("can set username and see join form", async ({ page }) => {
  await page.goto("/");
  const nameInput = page.getByPlaceholder("Display name");
  await nameInput.fill("E2EPlayer");
  await expect(nameInput).toHaveValue("E2EPlayer");
  await expect(page.getByPlaceholder("ROOM CODE")).toBeVisible();
});
