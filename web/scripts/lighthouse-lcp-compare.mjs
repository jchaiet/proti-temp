#!/usr/bin/env node
/**
 * Usage (from web):
 * node scripts/lighthouse-lcp-compare.mjs /path/to/report1.json /path/to/report2.json ...
 *
 * Lighthouse 13's LCP breakdown uses observed trace timing, while the
 * headline mobile LCP may be Lantern-simulated. Print both; don't mix them.
 */
import { readFileSync } from "node:fs";
import { basename } from "node:path";

const reports = process.argv.slice(2);

if (reports.length === 0) {
  console.error(
    "Usage: node scripts/lighthouse-lcp-compare.mjs <report.json> [...]",
  );
  process.exit(1);
}

const headings = [
  "Report",
  "Score",
  "Sim LCP ms",
  "Observed LCP ms",
  "Observed image delay ms",
  "Observed image transfer ms",
  "Observed render delay ms",
  "TBT ms",
  "CSS requests",
  "CSS bytes",
];

const output = [headings];

for (const report of reports) {
  const lhr = JSON.parse(readFileSync(report, "utf8"));
  const audits = lhr.audits ?? {};
  const metrics = audits.metrics?.details?.items?.[0] ?? {};
  const rows =
    audits["lcp-breakdown-insight"]?.details?.items?.[0]?.items ?? [];
  const breakdown = Object.fromEntries(
    rows.map((item) => [item.subpart, item.duration]),
  );
  const css = audits["resource-summary"]?.details?.items?.find(
    (item) => item.resourceType === "stylesheet",
  );

  output.push([
    basename(report),
    Math.round((lhr.categories?.performance?.score ?? 0) * 100),
    Math.round(audits["largest-contentful-paint"]?.numericValue ?? 0),
    Math.round(metrics.observedLargestContentfulPaint ?? 0),
    Math.round(breakdown.resourceLoadDelay ?? 0),
    Math.round(breakdown.resourceLoadDuration ?? 0),
    Math.round(breakdown.elementRenderDelay ?? 0),
    Math.round(audits["total-blocking-time"]?.numericValue ?? 0),
    css?.requestCount ?? 0,
    css?.transferSize ?? 0,
  ]);
}

const widths = headings.map((_, col) =>
  Math.max(...output.map((row) => String(row[col]).length)),
);

for (const row of output) {
  console.log(
    row.map((value, col) => String(value).padEnd(widths[col])).join(" | "),
  );
}
