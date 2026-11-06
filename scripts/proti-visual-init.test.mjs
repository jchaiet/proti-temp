import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const VISUAL_SCRIPT = new URL("./proti-visual-init.mjs", import.meta.url);

async function fixture({ configured = true, withSnapshot = false } = {}) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "proti-visual-test-"));
  const scripts = path.join(root, "scripts");
  const screenshots = path.join(
    root,
    "web",
    "e2e",
    "__screenshots__",
    "chromium-desktop",
  );
  const bin = path.join(root, "bin");

  await fs.mkdir(scripts, { recursive: true });
  await fs.mkdir(screenshots, { recursive: true });
  await fs.mkdir(bin, { recursive: true });
  await fs.copyFile(VISUAL_SCRIPT, path.join(scripts, "proti-visual-init.mjs"));

  if (configured) {
    await fs.writeFile(path.join(root, "proti.config.json"), "{}\n");
    await fs.writeFile(
      path.join(root, "web", ".env.local"),
      "NEXT_SANITY_PROJECT_ID=test\n",
    );
  }
  if (withSnapshot) {
    await fs.writeFile(path.join(screenshots, "home.png"), "old baseline");
  }

  // Mock the pnpm process: no network, build, browser, or real web server.
  // Written to PATH so the actual script runs unchanged.
  const pnpm = path.join(bin, "pnpm");
  await fs.writeFile(
    pnpm,
    `#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
const root = process.env.PROTI_VISUAL_TEST_ROOT;
fs.appendFileSync(path.join(root, "pnpm-calls.txt"), JSON.stringify({ args: process.argv.slice(2), url: process.env.PLAYWRIGHT_BASE_URL, server: process.env.PLAYWRIGHT_WEB_SERVER_COMMAND }) + "\\n");
if (process.argv.includes("--update-snapshots")) {
  const dest = path.join(root, "web", "e2e", "__screenshots__", "chromium-desktop", "home.png");
  fs.mkdirSync(path.dirname(dest), {recursive: true});
  fs.writeFileSync(dest, "site baseline");
}
`,
  );
  await fs.chmod(pnpm, 0o755);
  return { root, bin, screenshots };
}

function run(root, bin, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["scripts/proti-visual-init.mjs", ...args],
      {
        cwd: root,
        env: {
          ...process.env,
          PATH: `${bin}${path.delimiter}${process.env.PATH}`,
          PROTI_VISUAL_TEST_ROOT: root,
        },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.once("error", reject);
    child.once("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function clean(root) {
  await fs.rm(root, { recursive: true, force: true });
}

test(
  "visual baseline initialization requires project configuration",
  { skip: process.platform === "win32" },
  async () => {
    const { root, bin } = await fixture({ configured: false });
    try {
      const result = await run(root, bin);
      assert.notEqual(result.code, 0);
      assert.match(result.stderr, /Run pnpm proti:init first/);
    } finally {
      await clean(root);
    }
  },
);

test(
  "existing visual snapshots are not overwritten without --force",
  { skip: process.platform === "win32" },
  async () => {
    const { root, bin, screenshots } = await fixture({ withSnapshot: true });
    try {
      const result = await run(root, bin);
      assert.notEqual(result.code, 0);
      assert.match(result.stderr, /--force/);
      assert.equal(
        await fs.readFile(path.join(screenshots, "home.png"), "utf8"),
        "old baseline",
      );
      await assert.rejects(fs.access(path.join(root, "pnpm-calls.txt")), {
        code: "ENOENT",
      });
    } finally {
      await clean(root);
    }
  },
);

test(
  "generates project screenshots via build and Playwright",
  { skip: process.platform === "win32" },
  async () => {
    const { root, bin, screenshots } = await fixture();
    try {
      const result = await run(root, bin);
      assert.equal(result.code, 0, result.stderr);
      assert.equal(
        await fs.readFile(path.join(screenshots, "home.png"), "utf8"),
        "site baseline",
      );
      const calls = (
        await fs.readFile(path.join(root, "pnpm-calls.txt"), "utf8")
      )
        .trim()
        .split("\n")
        .map((line) => JSON.parse(line));
      assert.deepEqual(calls[0].args, ["--filter", "./web", "build"]);
      assert.ok(calls[1].args.includes("--update-snapshots"));
      assert.ok(calls[1].args.includes("--project=chromium-desktop"));
      assert.ok(calls[1].args.includes("--project=chromium-mobile"));
      assert.equal(calls[1].url, "http://localhost:3000");
      assert.equal(calls[1].server, "pnpm exec next start -p 3000");
    } finally {
      await clean(root);
    }
  },
);

test(
  "--force intentionally regenerates existing baselines",
  { skip: process.platform === "win32" },
  async () => {
    const { root, bin, screenshots } = await fixture({ withSnapshot: true });
    try {
      const result = await run(root, bin, ["--force"]);
      assert.equal(result.code, 0, result.stderr);
      assert.equal(
        await fs.readFile(path.join(screenshots, "home.png"), "utf8"),
        "site baseline",
      );
    } finally {
      await clean(root);
    }
  },
);
