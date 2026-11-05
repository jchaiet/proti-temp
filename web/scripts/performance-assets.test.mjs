import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { analyzeAssets, summarizeAssets } from "./performance-assets.mjs";

test("collects JS and CSS assets and ignores maps", async () => {
  const dir = await mkdtemp(join(tmpdir(), "proti-assets-"));
  try {
    await mkdir(join(dir, "chunks"));
    await writeFile(
      join(dir, "chunks", "main.js"),
      "console.log('ok');".repeat(20),
    );
    await writeFile(join(dir, "main.css"), ".foo{display:block}".repeat(20));
    await writeFile(join(dir, "main.js.map"), "ignored");
    const files = await analyzeAssets(dir);
    assert.deepEqual(files.map((x) => x.file).sort(), [
      "chunks/main.js",
      "main.css",
    ]);
    assert.ok(files.every((x) => x.bytes > 0 && x.gzip > 0 && x.brotli > 0));
    assert.equal(summarizeAssets(files).js.files, 1);
    assert.equal(summarizeAssets(files).css.files, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("supports empty inventories", async () => {
  const dir = await mkdtemp(join(tmpdir(), "proti-empty-"));
  try {
    assert.deepEqual(await analyzeAssets(dir), []);
    assert.equal(summarizeAssets([]).js.bytes, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
