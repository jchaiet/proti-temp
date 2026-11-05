import { defineConfig, devices } from "@playwright/test";

import { loadE2EEnv } from "./e2e/helpers/environment";

loadE2EEnv();

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL?.trim() || "http://127.0.0.1:3000";

const webServerCommand =
  process.env.PLAYWRIGHT_WEB_SERVER_COMMAND?.trim() || "pnpm dev";

const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === "1";

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
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
