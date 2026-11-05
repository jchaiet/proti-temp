#!/usr/bin/env node
/** Show first-load JS resources actually requested on one route, not all .next/static assets. */
const url = process.argv[2];
const mobile = process.argv.includes("--mobile");
if (!url || !/^https?:\/\//i.test(url)) {
  console.error(
    "Usage: node scripts/performance-route-js.mjs <http(s)://url> [--mobile]",
  );
  process.exit(1);
}

const { chromium } = await import("@playwright/test");
const browser = await chromium.launch();
try {
  const context = await browser.newContext(
    mobile
      ? {
          viewport: { width: 390, height: 844 },
          deviceScaleFactor: 2,
          isMobile: true,
          hasTouch: true,
        }
      : { viewport: { width: 1440, height: 900 } },
  );
  const page = await context.newPage();
  const response = await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(2000);

  const data = await page.evaluate(() => {
    const origin = location.origin;
    const resources = performance
      .getEntriesByType("resource")
      .filter((entry) => {
        const u = new URL(entry.name);
        return (
          u.origin === origin && /\.js(?:$|\?)/.test(u.pathname + u.search)
        );
      })
      .map((entry) => ({
        file: new URL(entry.name).pathname,
        transferKiB: Number((entry.transferSize / 1024).toFixed(1)),
        decodedKiB: Number((entry.decodedBodySize / 1024).toFixed(1)),
        startMs: Math.round(entry.startTime),
      }))
      .sort((a, b) => b.transferKiB - a.transferKiB);
    return { route: location.pathname, resources };
  });
  const totalKiB = data.resources.reduce(
    (sum, item) => sum + item.transferKiB,
    0,
  );
  console.log(
    JSON.stringify(
      {
        status: response?.status(),
        mobile,
        ...data,
        totalFirstPartyJsTransferKiB: Number(totalKiB.toFixed(1)),
      },
      null,
      2,
    ),
  );
  console.log(
    "Lab first-load JS requests only; the numbers do not measure code usage. In-page navigation and third-party JS are excluded.",
  );
  await context.close();
} finally {
  await browser.close();
}
