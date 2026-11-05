#!/usr/bin/env node
/** Chromium lab sample of LCP and CLS. Not real-user Core Web Vitals. */
const url = process.argv[2];
const mobile = process.argv.includes("--mobile");
if (!url || !/^https?:\/\//i.test(url)) {
  console.error(
    "Usage: node scripts/measure-performance.mjs <http(s)://url> [--mobile]",
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
  await page.addInitScript(() => {
    const metrics = { lcp: null, cls: 0 };
    Object.defineProperty(window, "__protiPerformance", { value: metrics });
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) metrics.lcp = entry.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      /* not supported */
    }
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) metrics.cls += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {
      /* not supported */
    }
  });
  const response = await page.goto(url, { waitUntil: "load", timeout: 60000 });
  await page.waitForTimeout(2500);
  const metrics = await page.evaluate(() => {
    const timing = performance.getEntriesByType("navigation")[0];
    const paint = performance.getEntriesByType("paint");
    return {
      url: location.href,
      lcpMs: window.__protiPerformance?.lcp ?? null,
      cls: window.__protiPerformance?.cls ?? null,
      fcpMs:
        paint.find((entry) => entry.name === "first-contentful-paint")
          ?.startTime ?? null,
      domContentLoadedMs: timing?.domContentLoadedEventEnd ?? null,
    };
  });
  console.log(
    JSON.stringify({ status: response?.status(), mobile, ...metrics }, null, 2),
  );
  console.log("Lab sample only. INP and real-user CWV are not measured.");
  await context.close();
} finally {
  await browser.close();
}
