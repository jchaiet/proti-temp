import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  copyScript,
  createTempRepo,
  removeTempRepo,
  runNode,
} from "./test-helpers.mjs";

const COMMAND = new URL("./proti-configure-production.mjs", import.meta.url);

async function makeRepo({ existing = "" } = {}) {
  const repo = await createTempRepo();
  await copyScript(COMMAND, repo, "proti-configure-production.mjs");
  const config = {
    version: 1,
    projectName: "Acme",
    packageName: "acme",
    sanity: {
      projectId: "abc123",
      dataset: "production",
      studioUrl: "https://studio.example.com",
      previewUrl: "http://localhost:3000",
      productionPreviewUrl: existing,
    },
    site: {
      name: "Acme",
      key: "acme",
      domains: ["localhost", "acme.vercel.app"],
      canonicalDomain: "acme.vercel.app",
    },
  };
  await fs.writeFile(
    path.join(repo, "proti.config.json"),
    JSON.stringify(config, null, 2),
  );
  await fs.writeFile(
    path.join(repo, "studio", ".env.development"),
    "SANITY_STUDIO_PREVIEW_URL=http://localhost:3000\n",
  );
  await fs.writeFile(
    path.join(repo, "studio", ".env.local"),
    "SANITY_STUDIO_APP_ID=existing-app\n",
  );
  return { repo, config };
}

test("updates production URL without changing development environment or Studio App ID", async () => {
  const { repo } = await makeRepo();
  try {
    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-configure-production.mjs",
      args: ["--url=https://acme.vercel.app/"],
    });
    assert.equal(result.code, 0, result.stderr);
    const config = JSON.parse(
      await fs.readFile(path.join(repo, "proti.config.json"), "utf8"),
    );
    assert.equal(config.sanity.previewUrl, "http://localhost:3000");
    assert.equal(config.sanity.productionPreviewUrl, "https://acme.vercel.app");
    assert.match(
      await fs.readFile(path.join(repo, "studio", ".env.production"), "utf8"),
      /SANITY_STUDIO_PREVIEW_URL=https:\/\/acme.vercel.app/,
    );
    assert.match(
      await fs.readFile(path.join(repo, "studio", ".env.development"), "utf8"),
      /SANITY_STUDIO_PREVIEW_URL=http:\/\/localhost:3000/,
    );
    assert.match(
      await fs.readFile(path.join(repo, "studio", ".env.local"), "utf8"),
      /SANITY_STUDIO_APP_ID=existing-app/,
    );
  } finally {
    await removeTempRepo(repo);
  }
});

test("preserves custom mode-specific values and updates only preview URL", async () => {
  const { repo } = await makeRepo({ existing: "https://old.vercel.app" });
  try {
    await fs.writeFile(
      path.join(repo, "studio", ".env.production"),
      "# Custom\nSANITY_STUDIO_CUSTOM_FLAG=true\nSANITY_STUDIO_PREVIEW_URL=https://old.vercel.app\n",
    );
    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-configure-production.mjs",
      args: ["--url", "https://acme.vercel.app"],
    });
    assert.equal(result.code, 0, result.stderr);
    const content = await fs.readFile(
      path.join(repo, "studio", ".env.production"),
      "utf8",
    );
    assert.match(content, /SANITY_STUDIO_CUSTOM_FLAG=true/);
    assert.match(
      content,
      /SANITY_STUDIO_PREVIEW_URL=https:\/\/acme.vercel.app/,
    );
    assert.doesNotMatch(content, /old.vercel.app/);
    assert.equal(
      (content.match(/SANITY_STUDIO_PREVIEW_URL=/g) || []).length,
      1,
    );
  } finally {
    await removeTempRepo(repo);
  }
});

test("rejects local or insecure production URLs without changing files", async () => {
  const { repo, config } = await makeRepo();
  try {
    for (const url of [
      "http://localhost:3000",
      "http://acme.vercel.app",
      "https://acme.vercel.app/unsafe-path",
      "not-a-url",
    ]) {
      const result = await runNode({
        cwd: repo,
        script: "scripts/proti-configure-production.mjs",
        args: [`--url=${url}`],
      });
      assert.notEqual(result.code, 0, url);
    }
    const updated = JSON.parse(
      await fs.readFile(path.join(repo, "proti.config.json"), "utf8"),
    );
    assert.deepEqual(updated, config);
    await assert.rejects(
      fs.access(path.join(repo, "studio", ".env.production")),
      { code: "ENOENT" },
    );
  } finally {
    await removeTempRepo(repo);
  }
});

test("warns when production hostname is not in Site domains", async () => {
  const { repo } = await makeRepo();
  try {
    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-configure-production.mjs",
      args: ["--url=https://other.vercel.app"],
    });
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stderr, /not in proti.config.json site.domains/);
    const config = JSON.parse(
      await fs.readFile(path.join(repo, "proti.config.json"), "utf8"),
    );
    assert.deepEqual(config.site.domains, ["localhost", "acme.vercel.app"]);
  } finally {
    await removeTempRepo(repo);
  }
});

test("can prompt for production URL when no CLI flag is given", async () => {
  const { repo } = await makeRepo();
  try {
    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-configure-production.mjs",
      input: "https://acme.vercel.app\n",
    });
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Production Presentation URL/);
  } finally {
    await removeTempRepo(repo);
  }
});

test("refuses to configure uninitialized project", async () => {
  const repo = await createTempRepo();
  try {
    await copyScript(COMMAND, repo, "proti-configure-production.mjs");
    const result = await runNode({
      cwd: repo,
      script: "scripts/proti-configure-production.mjs",
      args: ["--url=https://acme.vercel.app"],
    });
    assert.notEqual(result.code, 0);
    assert.match(result.stderr, /Run "pnpm proti:init" first/);
  } finally {
    await removeTempRepo(repo);
  }
});
