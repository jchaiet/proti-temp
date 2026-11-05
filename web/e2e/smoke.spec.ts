import { expect, test } from "@playwright/test";

import { getE2ERoutes } from "./helpers/routes";

const routes = getE2ERoutes();

for (const route of routes) {
  test(`${route.name} loads without a browser runtime error`, async ({ page }) => {
    const pageErrors: string[] = [];

    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    const response = await page.goto(route.path, {
      waitUntil: "load",
    });

    expect(response, `No document response was received for ${route.path}`).not.toBeNull();

    expect(
      response?.status(),
      `${route.path} returned HTTP ${response?.status()}`,
    ).toBeLessThan(400);

    await expect(page.locator("main")).toBeVisible();

    await expect(page.locator("body")).not.toContainText(
      "Application error: a client-side exception has occurred",
    );

    expect(
      pageErrors,
      `Browser page errors were reported while loading ${route.path}`,
    ).toEqual([]);
  });
}
