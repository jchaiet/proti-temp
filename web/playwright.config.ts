import { defineConfig, devices } from "@playwright/test";

import { loadE2EEnv } from "./e2e/helpers/environment";

loadE2EEnv();

// Proti resolves sites by hostname, so use the same development hostname
// for Playwright readiness checks and browser navigation.
const baseURL =
  process.env.PLAYWRIGHT_BASE_URL?.trim() || "http://localhost:3000";

// Keep the production server on the same port Playwright is testing.
// A dev server can silently move to 3001 when 3000 is occupied.
const serverPort = Number(new URL(baseURL).port || 3000);

const webServerCommand =
  process.env.PLAYWRIGHT_WEB_SERVER_COMMAND?.trim() ||
  `pnpm exec next start -p ${serverPort}`;

const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1";

// Use an application-level readiness endpoint that does not depend on
// Sanity content or which Site owns the incoming hostname.
// The browser tests still use baseURL to validate the actual pages.
const readinessURL = new URL("/api/health", baseURL).toString();

export default defineConfig({
  testDir: "./e2e",

  fullyParallel: true,

  forbidOnly: Boolean(process.env.CI),

  retries: process.env.CI ? 2 : 0,

  workers: process.env.CI ? 1 : undefined,

  reporter: process.env.CI
    ? [["line"], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],

  timeout: 30_000,

  expect: {
    timeout: 7_500,

    toHaveScreenshot: {
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.002,
    },
  },

  snapshotPathTemplate: "{testDir}/__screenshots__/{projectName}/{arg}{ext}",

  use: {
    baseURL,

    colorScheme: "light",
    reducedMotion: "reduce",

    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    {
      name: "chromium-desktop",

      use: {
        ...devices["Desktop Chrome"],
        viewport: {
          width: 1440,
          height: 900,
        },
      },
    },

    {
      name: "chromium-mobile",

      use: {
        ...devices["Pixel 7"],
      },
    },

    {
      name: "firefox-desktop",

      // Firefox participates in functional/smoke coverage. Visual baselines
      // stay Chromium-only to reduce browser-rendering noise.
      testIgnore: /visual\.spec\.ts/,

      use: {
        ...devices["Desktop Firefox"],
        viewport: {
          width: 1440,
          height: 900,
        },
      },
    },

    {
      // Responsive Firefox coverage (a narrow desktop viewport, not a real
      // Firefox Android device emulation).
      name: "firefox-mobile",
      testIgnore: /visual\.spec\.ts/,
      use: {
        ...devices["Desktop Firefox"],
        viewport: { width: 390, height: 844 },
      },
    },

    // WebKit requires an additional browser install. Enable it explicitly
    // with PLAYWRIGHT_INCLUDE_WEBKIT=1 to preserve the existing default suite.
    ...(process.env.PLAYWRIGHT_INCLUDE_WEBKIT === "1"
      ? [
          {
            name: "webkit-mobile",
            testIgnore: /visual\.spec\.ts/,
            use: { ...devices["iPhone 13"] },
          },
        ]
      : []),
  ],

  webServer: skipWebServer
    ? undefined
    : {
        command: webServerCommand,
        url: readinessURL,
        // Next.js can be ready even when the CMS-backed homepage is a 404.
        // Never reuse a stale dev server (or another app) on this port.
        reuseExistingServer: false,
        // Make `pnpm start` overrides use the same port as baseURL.
        env: { PORT: String(serverPort) },
        // Show startup output when Next.js fails to become ready.
        stdout: "pipe",
        stderr: "pipe",
        timeout: 120_000,
      },
});
