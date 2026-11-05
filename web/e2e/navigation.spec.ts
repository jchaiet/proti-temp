import { expect, test } from "@playwright/test";

import { getE2ERoutes } from "./helpers/routes";

const home = getE2ERoutes().find((route) => route.name === "home")?.path ?? "/";

async function openHome(page: import("@playwright/test").Page) {
  const response = await page.goto(home, { waitUntil: "load" });
  expect(
    response,
    "The configured home route must return a document",
  ).not.toBeNull();
  expect(
    response!.status(),
    "The configured home route must load",
  ).toBeLessThan(400);
  await expect(page.locator("main").first()).toBeVisible();
}

function requireMobile(projectName: string): void {
  test.skip(
    !projectName.endsWith("mobile"),
    "Mobile navigation behavior uses the narrow-viewport projects",
  );
}

function requireDesktop(projectName: string): void {
  test.skip(
    !projectName.endsWith("desktop"),
    "Desktop navigation behavior uses the desktop projects",
  );
}

test("mobile navigation locks the page without covering the close button", async ({
  page,
}, testInfo) => {
  requireMobile(testInfo.project.name);
  await openHome(page);

  await page.evaluate(() => {
    const maxScroll = Math.max(
      0,
      document.documentElement.scrollHeight - innerHeight,
    );
    scrollTo(0, Math.min(320, maxScroll));
  });
  const originalScroll = await page.evaluate(() => scrollY);

  await page.getByRole("button", { name: "Open navigation menu" }).click();
  const dialog = page.getByRole("dialog", { name: "Mobile navigation menu" });
  const close = page.getByRole("button", { name: "Close navigation menu" });
  const menu = dialog.getByRole("navigation", { name: "Mobile navigation" });

  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(close).toBeVisible();
  await expect(menu).toBeVisible();
  await expect(page.locator("body")).toHaveCSS("position", "fixed");
  await expect
    .poll(() =>
      page
        .locator("main")
        .first()
        .evaluate((main) => Boolean(main.closest("[inert]"))),
    )
    .toBe(true);

  // Test actual hit-testing: z-index regressions can leave the X visible but
  // covered by the menu, which React/jsdom tests cannot detect.
  expect(
    await close.evaluate((button) => {
      const box = button.getBoundingClientRect();
      const hit = document.elementFromPoint(
        box.left + box.width / 2,
        box.top + box.height / 2,
      );
      return hit === button || button.contains(hit);
    }),
  ).toBe(true);

  const openScroll = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 500);
  expect(await page.evaluate(() => scrollY)).toBe(openScroll);

  // The menu remains scrollable when its content exceeds the viewport.
  const menuMetrics = await menu.evaluate((node) => ({
    clientHeight: node.clientHeight,
    scrollHeight: node.scrollHeight,
    overflowY: getComputedStyle(node).overflowY,
  }));
  expect(menuMetrics.overflowY).toBe("auto");
  if (menuMetrics.scrollHeight > menuMetrics.clientHeight) {
    await menu.evaluate((node) => {
      node.scrollTop = 120;
    });
    expect(await menu.evaluate((node) => node.scrollTop)).toBeGreaterThan(0);
  }

  await close.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(originalScroll);
});

test("mobile keyboard focus stays in the navigation and Escape dismisses it", async ({
  page,
}, testInfo) => {
  requireMobile(testInfo.project.name);
  await openHome(page);

  const toggle = page.getByRole("button", { name: "Open navigation menu" });
  await toggle.focus();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog", { name: "Mobile navigation menu" });
  const close = page.getByRole("button", { name: "Close navigation menu" });
  await expect(close).toBeFocused();

  await page.keyboard.press("Shift+Tab");
  expect(
    await page.evaluate(() => {
      const dialogElement = document.querySelector(
        '[role="dialog"][aria-modal="true"]',
      );
      return Boolean(dialogElement?.contains(document.activeElement));
    }),
  ).toBe(true);

  // Attempt programmatic focus on the inert background.
  await page.evaluate(() => {
    (document.querySelector("main a[href]") as HTMLElement | null)?.focus();
  });
  expect(
    await page.evaluate(() => {
      const dialogElement = document.querySelector(
        '[role="dialog"][aria-modal="true"]',
      );
      return Boolean(dialogElement?.contains(document.activeElement));
    }),
  ).toBe(true);

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open navigation menu" }),
  ).toBeFocused();
});

test("mobile submenu Escape closes its section before dismissing the menu", async ({
  page,
}, testInfo) => {
  requireMobile(testInfo.project.name);
  await openHome(page);
  await page.getByRole("button", { name: "Open navigation menu" }).click();

  const dialog = page.getByRole("dialog", { name: "Mobile navigation menu" });
  const menu = dialog.getByRole("navigation", { name: "Mobile navigation" });
  // Keep the locator stable: `aria-expanded` changes after clicking, so it
  // must not be part of the selector used for subsequent assertions.
  const expandable = menu
    .locator("button[aria-controls][aria-expanded]")
    .first();
  test.skip(
    (await expandable.count()) === 0,
    "The configured header has no submenu to expand",
  );

  await expect(expandable).toHaveAttribute("aria-expanded", "false");
  await expandable.click();
  await expect(expandable).toHaveAttribute("aria-expanded", "true");
  await expandable.press("Escape");
  await expect(expandable).toHaveAttribute("aria-expanded", "false");
  await expect(dialog).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("resizing to desktop releases the mobile scroll lock", async ({
  page,
}, testInfo) => {
  requireMobile(testInfo.project.name);
  await openHome(page);
  await page.getByRole("button", { name: "Open navigation menu" }).click();
  await expect(page.locator("body")).toHaveCSS("position", "fixed");

  await page.setViewportSize({ width: 1024, height: 800 });
  await expect(
    page.getByRole("dialog", { name: "Mobile navigation menu" }),
  ).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveCSS("position", "fixed");
  await expect
    .poll(() =>
      page
        .locator("main")
        .first()
        .evaluate((main) => Boolean(main.closest("[inert]"))),
    )
    .toBe(false);
});

test("desktop submenu works with keyboard Enter and Escape", async ({
  page,
}, testInfo) => {
  requireDesktop(testInfo.project.name);
  await openHome(page);

  const mainNav = page.getByRole("navigation", { name: "Main navigation" });
  await expect(mainNav).toBeVisible();
  const expandable = mainNav.locator("button[aria-expanded]").first();
  test.skip(
    (await expandable.count()) === 0,
    "The configured header has no desktop dropdown/mega-menu",
  );

  await expandable.focus();
  await expandable.press("Enter");
  await expect(expandable).toHaveAttribute("aria-expanded", "true");
  await expandable.press("Escape");
  await expect(expandable).toHaveAttribute("aria-expanded", "false");
  await expect(expandable).toBeFocused();
});
