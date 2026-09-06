# Changelog

所有重要變更都會記錄在此檔。

格式參考 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.1.0/)。

---

## [3.0.2] - 2026-09-06

### Changed
- **build**: 修正 production dist/ 缺漏的問題
  - 之前 `npm run build` 只輸出 `index.html` (meta refresh redirect)，但 `dashboard.html` 沒被複製到 `dist/`，導致 Vercel production 第一頁 redirect 完就 404
  - 新增 `scripts/postbuild.mjs` 把 `dashboard.html` 複製到 `dist/`
  - `package.json` build script 改為 `vite build && node scripts/postbuild.mjs`
- **lint**: 從無 lint 改為 ESLint 9 flat config
  - 新增 `eslint.config.js`（寬鬆設定：只抓 no-undef / no-unreachable / no-dupe-keys / no-empty，風格規則留給後續 PR）
  - 新增 `lint` script
  - 新增 deps: `eslint@^9`, `@eslint/js`, `globals`
- **lint fix**: 修復 2 個現存 lint error
  - `api/fetch-comments.js` 第 363-364 行：character class 內 `\)` 改為 `)`（不必要的 escape）
  - `src/components/PageSelectorModal.jsx` 第 178 行：移除失效的 `// eslint-disable-line react-hooks/exhaustive-deps` 註解（rule 不在 config 中）
- **tests**: 維持原本 36 個 src/lib/*.test.js + 新增 4 個 `tests/postbuild.test.js` 驗證 dist/ 產物

### Added
- **ci**: `.github/workflows/ci.yml` 4-job workflow（lint / test / build / deploy），deploy target = `vercel`
- **docs**: `PRD/SPEC.md` v3.0.2 + `PRD/CHANGELOG.md` v3.0.2
- **scripts**: `scripts/postbuild.mjs` 構建後處理

### Quality Gates
- ✅ `npm run lint` — 0 error (25 warning，風格層級可後續 PR 處理)
- ✅ `npm test` — 40/40 pass (Vitest, 4 個檔)
- ✅ `npm run build` — green, dist/ 內含 `index.html` + `dashboard.html` 14.7KB

---

## [2.5] - 2026-08-16 (pre-batch)

### Changed
- 從 v2.4 開始累積的 SPEC drift（OAuth 困境 + GitHub Pages 備援）

### Added
- SPEC_DRIFT Appendix C

---

## [2.4] - 2026-08-10 (pre-batch)

### Added
- 36 個 Vitest unit tests（3 個檔）
- API rate limiting（`api/_lib/rate-limit.js`）
- Security headers via `vercel.json` (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- PageSelectorModal（粉專/貼文 picker）
- Toast 元件 / Loading Skeleton
- i18n dict

### Refactor
- 拆 `App.jsx` 為多個 component + `lib/` utilities

---

## [2.2.1] - 2026-07-11 (pre-batch)

### Added
- SPEC v2.2.1 完整規格書
- Vite 5 + React 18 升級

---

## [1.0.0] - 2026-06-XX (pre-batch)

### Added
- 初版 `dashboard.html` 單檔 SPA
- 留言解析 / 去重 / 隨機抽獎核心
- FB OAuth（dev mode）
