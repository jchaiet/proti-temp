#!/usr/bin/env node
/**
 * Compare Lighthouse Navigation reports without external dependencies.
 * Usage: node scripts/compare-lighthouse-css.mjs report1.json report2.json ...
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";

if (process.argv.length < 3) {
  console.error(
    "Usage: node scripts/compare-lighthouse-css.mjs <report1.json> [report2.json ...]",
  );
  process.exitCode = 1;
} else {
  const asNumber = (value) =>
    typeof value === "number" && Number.isFinite(value) ? value : 0;

  const asMs = (value) =>
    typeof value === "number" ? (value / 1000).toFixed(2) : "n/a";

  for (const name of process.argv.slice(2)) {
    const report = JSON.parse(readFileSync(name, "utf8"));
    const audits = report.audits ?? {};
    const blocking = audits["render-blocking-insight"]?.details?.items ?? [];
    const wasted =
      audits["unused-css-rules"]?.details?.overallSavingsBytes ?? 0;
    const network = audits["network-requests"]?.details?.items ?? [];
    const cssRequests = network.filter(
      (entry) => entry.resourceType === "Stylesheet",
    );
    const jsRequests = network.filter(
      (entry) => entry.resourceType === "Script",
    );
    const unsized = audits["unsized-images"]?.details?.items ?? [];

    console.log(`\n${basename(name)}`);
    console.log(
      `  URL:              ${report.finalUrl ?? report.requestedUrl ?? "n/a"}`,
    );
    console.log(
      `  Performance:      ${Math.round(asNumber(report.categories?.performance?.score) * 100)}`,
    );
    console.log(
      `  CPU benchmark:    ${report.environment?.benchmarkIndex ?? "n/a"}`,
    );
    console.log(
      `  FCP:              ${asMs(audits["first-contentful-paint"]?.numericValue)} s`,
    );
    console.log(
      `  LCP:              ${asMs(audits["largest-contentful-paint"]?.numericValue)} s`,
    );
    console.log(
      `  TBT:              ${Math.round(asNumber(audits["total-blocking-time"]?.numericValue))} ms`,
    );
    console.log(
      `  CLS:              ${audits["cumulative-layout-shift"]?.numericValue ?? "n/a"}`,
    );
    console.log(`  Stylesheets:      ${cssRequests.length}`);
    console.log(
      `  Stylesheet bytes: ${Math.round(cssRequests.reduce((sum, item) => sum + asNumber(item.transferSize), 0))}`,
    );
    console.log(`  Render blocking:  ${blocking.length} CSS requests`);
    console.log(
      `  Unused CSS:       ${Math.round(wasted)} bytes (Lighthouse estimate)`,
    );
    console.log(`  Script requests:  ${jsRequests.length}`);
    console.log(`  Unsized images:   ${unsized.length}`);
    if (blocking.length) {
      console.log("  Blocking CSS files:");
      for (const entry of blocking) {
        console.log(
          `    ${entry.url?.split("/").at(-1) ?? "unknown"} ${Math.round(asNumber(entry.totalBytes))} B`,
        );
      }
    }
  }
}
