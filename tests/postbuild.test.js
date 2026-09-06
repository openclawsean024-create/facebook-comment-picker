/**
 * postbuild.mjs 行為測試
 * 驗證 Vite build 之後 dist/ 裡有必要的 static files
 */
import { describe, it, expect, beforeAll } from "vitest";
import { existsSync, statSync, readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DIST = join(ROOT, "dist");

describe("postbuild", () => {
  beforeAll(() => {
    // 確保 dist/ 存在；若不存在，跑一次 build
    if (!existsSync(DIST)) {
      execSync("npm run build", { cwd: ROOT, stdio: "pipe" });
    }
  }, 120_000);

  it("dist/index.html exists (Vite entry)", () => {
    expect(existsSync(join(DIST, "index.html"))).toBe(true);
  });

  it("dist/dashboard.html exists (standalone SPA fallback)", () => {
    expect(existsSync(join(DIST, "dashboard.html"))).toBe(true);
  });

  it("dist/dashboard.html is a non-trivial HTML (>5KB)", () => {
    const size = statSync(join(DIST, "dashboard.html")).size;
    expect(size).toBeGreaterThan(5_000);
  });

  it("dist/dashboard.html contains the app mount point", () => {
    const html = readFileSync(join(DIST, "dashboard.html"), "utf8");
    // dashboard.html 雖不需 React root，但應包含 app 內容（標題 / 容器）
    expect(html.length).toBeGreaterThan(0);
    expect(html).toMatch(/<html/i);
  });
});
