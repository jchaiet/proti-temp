import { expect, test } from "@playwright/test";

import { getE2ERoutes } from "./helpers/routes";

const home = getE2ERoutes().find((route) => route.name === "home")?.path ?? "/";

test("mobile navigation open visual baseline", async ({ page }, testInfo) => {
  test.skip(
    !testInfo.project.name.endsWith("mobile"),
    "Mobile-only visual baseline",
  );
  test.skip(
    testInfo.project.name !== "chromium-mobile",
    "Keep a single stable visual baseline engine",
  );
  test.skip(
    process.env.NAVIGATION_VISUAL !== "1",
    "Opt-in: NAVIGATION_VISUAL=1",
  );

  await page.goto(home, { waitUntil: "load" });
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(
    page.getByRole("dialog", { name: "Mobile navigation menu" }),
  ).toBeVisible();

  await expect(page).toHaveScreenshot("mobile-navigation-open.png", {
    fullPage: false,
  });
});
