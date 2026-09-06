#!/usr/bin/env node
/**
 * Postbuild script: copy static assets (dashboard.html, favicon, etc.) into dist/
 * 讓 Vercel 上 production 同時有 Vite index.html 與 standalone dashboard.html。
 */
import { copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist");

// 確保 dist/ 存在
if (!existsSync(DIST)) {
  mkdirSync(DIST, { recursive: true });
}

// 要複製到 dist/ 的 standalone 檔案
const STATIC_FILES = [
  "dashboard.html", // standalone single-file SPA（CDN Tailwind + 內嵌 JS）
];

let copied = 0;
for (const rel of STATIC_FILES) {
  const src = join(ROOT, rel);
  const dst = join(DIST, rel);
  if (!existsSync(src)) {
    console.warn(`[postbuild] skip (not found): ${rel}`);
    continue;
  }
  mkdirSync(dirname(dst), { recursive: true });
  copyFileSync(src, dst);
  const size = statSync(dst).size;
  console.log(`[postbuild] copied ${rel} (${size} bytes)`);
  copied++;
}

console.log(`[postbuild] done. ${copied} file(s) copied to dist/.`);
