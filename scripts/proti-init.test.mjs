import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

import {
  copyScript,
  createTempRepo,
  removeTempRepo,
  runNode,
  scriptedInput,
} from "./test-helpers.mjs";

const INIT_SCRIPT = new URL("./proti-init.mjs", import.meta.url);

test("fresh clone uses generic defaults and language-region locales", async () => {
  const repo = await createTempRepo();

  try {
    await copyScript(INIT_SCRIPT, repo, "proti-init.mjs");

    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput([
        "",
        "",
        "test123",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ]),
    });

    assert.equal(result.code, 0, result.stderr);

    assert.match(result.stdout, /Project name \[Proti Site\]/);

    assert.match(result.stdout, /Package\/project slug \[proti-site\]/);

    assert.match(result.stdout, /Sanity project ID:/);

    assert.doesNotMatch(
      result.stdout,
      /Sanity project ID \[[^\]]+\]/,
      "A fresh clone must not prefill a real Sanity project ID.",
    );

    assert.match(result.stdout, /pnpm proti:seed --starter-content/);

    assert.match(result.stdout, /pnpm proti:check/);

    const config = JSON.parse(
      await fs.readFile(path.join(repo, "proti.config.json"), "utf8"),
    );

    assert.equal(config.projectName, "Proti Site");

    assert.equal(config.packageName, "proti-site");

    assert.equal(config.sanity.projectId, "test123");

    assert.equal(config.site.canonicalDomain, "localhost");

    assert.equal(config.site.defaultLocale, "en-us");

    assert.deepEqual(config.site.locales, [
      {
        code: "en-us",
        label: "English (US)",
      },
      {
        code: "es-us",
        label: "Spanish (US)",
      },
    ]);
  } finally {
    await removeTempRepo(repo);
  }
});

test("initializer normalizes project names, domains, and locale input", async () => {
  const repo = await createTempRepo();

  try {
    await copyScript(INIT_SCRIPT, repo, "proti-init.mjs");

    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput([
        "Acme Health",
        "",
        "abc123",
        "production",
        "https://studio.example.com",
        "https://www.example.com",
        "",
        "",
        "HTTPS://EXAMPLE.COM/, localhost, example.com",
        "",
        "EN-US",
        "EN-US:English, ES-US:Español",
      ]),
    });

    assert.equal(result.code, 0, result.stderr);

    const config = JSON.parse(
      await fs.readFile(path.join(repo, "proti.config.json"), "utf8"),
    );

    assert.equal(config.packageName, "acme-health");

    assert.equal(config.site.key, "acme-health");

    assert.deepEqual(config.site.domains, ["example.com", "localhost"]);

    assert.equal(config.site.canonicalDomain, "example.com");

    assert.equal(config.site.defaultLocale, "en-us");

    assert.deepEqual(
      config.site.locales.map(({ code }) => code),
      ["en-us", "es-us"],
    );
  } finally {
    await removeTempRepo(repo);
  }
});

test("initializer rejects a canonical domain outside Site domains", async () => {
  const repo = await createTempRepo();

  try {
    await copyScript(INIT_SCRIPT, repo, "proti-init.mjs");

    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput([
        "Acme",
        "acme",
        "abc123",
        "production",
        "",
        "",
        "Acme",
        "acme",
        "example.com, www.example.com",
        "canonical.example.com",
      ]),
    });

    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /must be included in Site domains/);
  } finally {
    await removeTempRepo(repo);
  }
});

test("initializer accepts three-letter language codes", async () => {
  const repo = await createTempRepo();

  try {
    await copyScript(INIT_SCRIPT, repo, "proti-init.mjs");

    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput([
        "Filipino Site",
        "filipino-site",
        "abc123",
        "production",
        "",
        "",
        "",
        "",
        "localhost",
        "",
        "fil-ph",
        "fil-ph:Filipino (Philippines), en-us:English (US)",
      ]),
    });

    assert.equal(result.code, 0, result.stderr);

    const config = JSON.parse(
      await fs.readFile(path.join(repo, "proti.config.json"), "utf8"),
    );

    assert.equal(config.site.defaultLocale, "fil-ph");
    assert.deepEqual(
      config.site.locales.map(({ code }) => code),
      ["fil-ph", "en-us"],
    );
  } finally {
    await removeTempRepo(repo);
  }
});

test("initializer rejects Site domains with ports", async () => {
  const repo = await createTempRepo();

  try {
    await copyScript(INIT_SCRIPT, repo, "proti-init.mjs");

    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput([
        "",
        "",
        "abc123",
        "",
        "",
        "",
        "",
        "",
        "localhost:3000",
      ]),
    });

    assert.notEqual(result.code, 0);

    assert.match(result.stderr, /must not include a port/);
  } finally {
    await removeTempRepo(repo);
  }
});

test("rerunning the initializer reuses local values and preserves secrets", async () => {
  const repo = await createTempRepo();

  try {
    await copyScript(INIT_SCRIPT, repo, "proti-init.mjs");

    const first = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput([
        "Acme",
        "acme",
        "abc123",
        "production",
        "http://localhost:3333",
        "http://localhost:3000",
        "Acme",
        "acme",
        "localhost",
        "",
        "en-us",
        "en-us:English, es-us:Spanish",
      ]),
    });

    assert.equal(first.code, 0, first.stderr);

    const webEnvPath = path.join(repo, "web", ".env.local");

    let env = await fs.readFile(webEnvPath, "utf8");

    env = env
      .replace("SANITY_API_READ_TOKEN=", "SANITY_API_READ_TOKEN=read-token")
      .replace("SANITY_API_WRITE_TOKEN=", "SANITY_API_WRITE_TOKEN=write-token")
      .replace(
        "SANITY_REVALIDATE_SECRET=",
        "SANITY_REVALIDATE_SECRET=revalidate-secret",
      );

    await fs.writeFile(webEnvPath, env);

    const second = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput(new Array(12).fill("")),
    });

    assert.equal(second.code, 0, second.stderr);

    assert.match(second.stdout, /Project name \[Acme\]/);

    assert.match(second.stdout, /Sanity project ID \[abc123\]/);

    const rewrittenEnv = await fs.readFile(webEnvPath, "utf8");

    assert.match(rewrittenEnv, /SANITY_API_READ_TOKEN=read-token/);

    assert.match(rewrittenEnv, /SANITY_API_WRITE_TOKEN=write-token/);

    assert.match(rewrittenEnv, /SANITY_REVALIDATE_SECRET=revalidate-secret/);
  } finally {
    await removeTempRepo(repo);
  }
});

test("initializer rejects malformed locale shapes", async () => {
  const repo = await createTempRepo();

  try {
    await copyScript(INIT_SCRIPT, repo, "proti-init.mjs");

    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput([
        "",
        "",
        "abc123",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "en-usa",
        "en-usa:English",
      ]),
    });

    assert.notEqual(result.code, 0);

    assert.match(result.stderr, /Use language-region format, e\.g\. en-us/);
  } finally {
    await removeTempRepo(repo);
  }
});

test("first initialization clears inherited visual baselines and rerun preserves new ones", async () => {
  const repo = await createTempRepo();
  const snapshots = path.join(
    repo,
    "web",
    "e2e",
    "__screenshots__",
    "chromium-desktop",
  );
  const screenshot = path.join(snapshots, "home.png");
  const note = path.join(snapshots, "README.md");
  const mobileScreenshot = path.join(
    repo,
    "web",
    "e2e",
    "__screenshots__",
    "chromium-mobile",
    "home.png",
  );

  try {
    await copyScript(INIT_SCRIPT, repo, "proti-init.mjs");
    await fs.mkdir(snapshots, { recursive: true });
    await fs.mkdir(path.dirname(mobileScreenshot), { recursive: true });
    await fs.writeFile(screenshot, "inherited demo screenshot");
    await fs.writeFile(mobileScreenshot, "inherited mobile screenshot");
    await fs.writeFile(note, "Snapshot directory information");

    const first = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput(["", "", "abc123", ...new Array(9).fill("")]),
    });

    assert.equal(first.code, 0, first.stderr);
    assert.match(first.stdout, /Removed inherited demo visual baselines/);
    assert.match(first.stdout, /pnpm proti:visual:init/);
    await assert.rejects(fs.access(screenshot), { code: "ENOENT" });
    await assert.rejects(fs.access(mobileScreenshot), { code: "ENOENT" });
    assert.equal(
      await fs.readFile(note, "utf8"),
      "Snapshot directory information",
    );
    assert.ok((await fs.stat(snapshots)).isDirectory());
    assert.ok((await fs.stat(path.dirname(mobileScreenshot))).isDirectory());

    await fs.mkdir(snapshots, { recursive: true });
    await fs.writeFile(screenshot, "new project screenshot");

    const second = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput(new Array(12).fill("")),
    });

    assert.equal(second.code, 0, second.stderr);
    assert.doesNotMatch(
      second.stdout,
      /Removed inherited demo visual baselines/,
    );
    assert.equal(
      await fs.readFile(screenshot, "utf8"),
      "new project screenshot",
    );
  } finally {
    await removeTempRepo(repo);
  }
});

test("initializing a cloned proti-demo repository clears its origin and demo screenshots", async () => {
  const repo = await createTempRepo();
  const screenshot = path.join(
    repo,
    "web",
    "e2e",
    "__screenshots__",
    "chromium-mobile",
    "home.png",
  );

  try {
    await copyScript(INIT_SCRIPT, repo, "proti-init.mjs");
    execFileSync("git", ["init", "-q"], { cwd: repo });
    execFileSync(
      "git",
      ["remote", "add", "origin", "git@github.com:example/proti-demo.git"],
      { cwd: repo },
    );
    await fs.mkdir(path.dirname(screenshot), { recursive: true });
    await fs.writeFile(screenshot, "demo screenshot");

    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-init.mjs",
      input: scriptedInput(["", "", "abc123", ...new Array(9).fill("")]),
    });

    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Initialized independent Git repository/);
    assert.match(result.stdout, /Removed inherited demo visual baselines/);
    assert.equal(
      execFileSync("git", ["remote", "-v"], {
        cwd: repo,
        encoding: "utf8",
      }).trim(),
      "",
    );
    await assert.rejects(fs.access(screenshot), { code: "ENOENT" });
  } finally {
    await removeTempRepo(repo);
  }
});
