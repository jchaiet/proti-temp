#!/usr/bin/env node
// Run from Proti/web *after* reinstalling the freshly packed Mino archive.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const cwd = process.cwd();
const required = [
  "src/components/BlockRenderer/Hero.tsx",
  "src/components/BlockRenderer/HeroActions.tsx",
  "node_modules/mino-ui/dist/blocks/components/HeroBlock/types.d.ts",
];
const missing = required.filter((path) => !existsSync(resolve(cwd, path)));
if (missing.length > 0) {
  console.error("Missing files:", missing.join(", "));
  process.exit(1);
}

const text = (file) => readFileSync(resolve(cwd, file), "utf8");
const hero = text(required[0]);
const actions = text(required[1]);
const types = text(required[2]);
const issues = [];
if (/^\s*["']use client["'];?/m.test(hero)) {
  issues.push("Hero.tsx still contains a 'use client' directive.");
}
if (!hero.includes("<HeroActions")) {
  issues.push("Hero.tsx does not reference HeroActions.");
}
if (!/^\s*["']use client["'];?/.test(actions)) {
  issues.push("HeroActions.tsx must have the 'use client' directive.");
}
if (!types.includes("ctaContent")) {
  issues.push(
    "Installed Mino package lacks HeroBlock.ctaContent; repack and reinstall the .tgz.",
  );
}

if (issues.length) {
  console.error(
    "Hero integration verification FAILED:\n" +
      issues.map((x) => `- ${x}`).join("\n"),
  );
  process.exit(1);
}
console.log(
  "Hero integration verified: Proti server wrapper + client CTA island + installed Mino CTA slot.",
);
