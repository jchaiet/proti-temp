import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SNAPSHOT_DIR = path.join(ROOT, "web", "e2e", "__screenshots__");
// Default to the usual local website port, while allowing isolated test runs
// (or developers with multiple projects) to select another available port.
const configuredPort = process.env.PROTI_VISUAL_PORT?.trim() || "3000";
if (!/^\d+$/.test(configuredPort)) {
  throw new Error("PROTI_VISUAL_PORT must be an integer between 1 and 65535.");
}
const PORT = Number(configuredPort);
if (!Number.isSafeInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error("PROTI_VISUAL_PORT must be an integer between 1 and 65535.");
}
const PNPM = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
const args = process.argv.slice(2);
const force = args.includes("--force");

if (args.some((arg) => arg !== "--force")) {
  console.error("Usage: pnpm proti:visual:init [--force]");
  process.exit(1);
}

async function exists(file) {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

async function hasScreenshots(directory) {
  if (!(await exists(directory))) return false;

  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".png"))
      return true;
    if (
      entry.isDirectory() &&
      (await hasScreenshots(path.join(directory, entry.name)))
    ) {
      return true;
    }
  }
  return false;
}

async function ensurePortAvailable() {
  const server = net.createServer();

  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(PORT, "0.0.0.0", resolve);
    });
  } catch (error) {
    throw new Error(
      `Port ${PORT} is occupied. Stop other Next.js servers before running visual initialization. (${error.message})`,
    );
  } finally {
    if (server.listening) {
      await new Promise((resolve) => server.close(resolve));
    }
  }
}

function run(args, additionalEnv = {}) {
  const result = spawnSync(PNPM, args, {
    cwd: ROOT,
    stdio: "inherit",
    env: { ...process.env, ...additionalEnv },
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `Command failed with exit code ${result.status}: pnpm ${args.join(" ")}`,
    );
  }
}

console.log("\nProti visual baseline initialization\n");

if (!(await exists(path.join(ROOT, "proti.config.json")))) {
  throw new Error("Project is not configured. Run pnpm proti:init first.");
}
if (!(await exists(path.join(ROOT, "web", ".env.local")))) {
  throw new Error(
    "Missing web/.env.local. Configure the project before generating baselines.",
  );
}

if ((await hasScreenshots(SNAPSHOT_DIR)) && !force) {
  throw new Error(
    "Visual baselines already exist. To intentionally replace them, run pnpm proti:visual:init --force.",
  );
}

await ensurePortAvailable();
console.log("Building Next.js production website...");
run(["--filter", "./web", "build"]);

// Recheck because other local dev servers could start during the build.
await ensurePortAvailable();
console.log("Generating Playwright desktop and mobile baselines...");
run(
  [
    "--filter",
    "./web",
    "run",
    "test:e2e:visual",
    "--project=chromium-desktop",
    "--project=chromium-mobile",
    "--update-snapshots",
  ],
  {
    PLAYWRIGHT_BASE_URL: `http://localhost:${PORT}`,
    PLAYWRIGHT_WEB_SERVER_COMMAND: `pnpm exec next start -p ${PORT}`,
    PLAYWRIGHT_SKIP_WEBSERVER: "0",
  },
);

// Visual tests currently capture the home route for both Chromium projects.
// A successful process alone does not guarantee both baselines were written.
const requiredBaselines = ["chromium-desktop", "chromium-mobile"].map(
  (project) => path.join(SNAPSHOT_DIR, project, "home.png"),
);
const missingBaselines = [];
for (const file of requiredBaselines) {
  if (!(await exists(file))) {
    missingBaselines.push(path.relative(ROOT, file));
  }
}
if (missingBaselines.length > 0) {
  throw new Error(
    `Playwright completed, but required visual baselines are missing: ${missingBaselines.join(", ")}. Check web/e2e/visual.spec.ts.`,
  );
}

console.log("\n✓ Site-specific visual baselines generated.");
console.log("Review web/e2e/__screenshots__, then commit the new screenshots.");
console.log(
  "CI should compare against these snapshots; it should never update them automatically.\n",
);
