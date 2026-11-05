#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { gzipSync, brotliCompressSync } from "node:zlib";
import { pathToFileURL } from "node:url";

/** Inventory of ALL built JS/CSS assets (not the files loaded by one page). */
export async function analyzeAssets(directory) {
  const root = resolve(directory);
  const files = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const pathname = join(dir, entry.name);
      if (entry.isDirectory()) await walk(pathname);
      else if (entry.isFile() && /\.(js|css)$/.test(entry.name)) {
        const contents = await readFile(pathname);
        files.push({
          file: relative(root, pathname).replaceAll("\\", "/"),
          type: entry.name.endsWith(".js") ? "js" : "css",
          bytes: contents.length,
          gzip: gzipSync(contents).length,
          brotli: brotliCompressSync(contents).length,
        });
      }
    }
  }
  await walk(root);
  return files.sort((a, b) => b.bytes - a.bytes);
}

export function summarizeAssets(files) {
  return Object.fromEntries(
    ["js", "css"].map((type) => {
      const relevant = files.filter((f) => f.type === type);
      return [
        type,
        {
          files: relevant.length,
          bytes: relevant.reduce((sum, f) => sum + f.bytes, 0),
          gzip: relevant.reduce((sum, f) => sum + f.gzip, 0),
          brotli: relevant.reduce((sum, f) => sum + f.brotli, 0),
        },
      ];
    }),
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const directory = resolve(process.argv[2] ?? ".next/static");
  try {
    const assets = await analyzeAssets(directory);
    console.log(`Total build-asset inventory: ${directory}`);
    console.table(summarizeAssets(assets));
    console.table(assets.slice(0, 20));
    console.log(
      "These totals do not indicate per-route transferred JavaScript.",
    );
  } catch (error) {
    console.error(`Unable to inspect ${directory}: ${error.message}`);
    process.exitCode = 1;
  }
}
