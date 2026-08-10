

---

## Appendix A: Drift (v2.3) — 2026-08-10

**注意**: 從 v2.2.1 開始累積的 spec 漂移:

| 項目 | SPEC 寫 | 實際 |
|---|---|---|
| F-014 FB OAuth + Graph API | ✅ 已完成 | ✅ 已完成（但需要 Meta App 設定 + Redeploy） |
| 37 個單元測試 | ✅ 已完成 | ❌ v2.2.1 沒寫, v2.3 才新增 36 個測試 |
| pages_show_list 範圍 | F-101 v2 才有 | **提前到 v1**（用 user-level dev mode 即能 work） |
| 商家驗證 | 沒寫 | dev mode 不需要, Live 模式才需要 |
| 4 種去重 + 條件篩選 | ✅ | ✅ 已加 36 個 vitest 測試覆蓋 |
| Token 改 HttpOnly cookie | 沒寫 | **v2.4 規劃**  |
| Rate limiting | 沒寫 | ✅ v2.3 新增（30-120 req/min per IP） |
| Security headers (CSP, X-Frame, etc.) | 沒寫 | ✅ v2.3 新增（vercel.json） |
| 一鍵搜尋查步驟：登入→選粉專→選貼文 | 沒寫 | ✅ v2.3 新增（PageSelectorModal） |

## Appendix B: P0/P1/P2 優化完成清單 (2026-08-10)

### P0 (5/5 完成)
1. Security headers via vercel.json (CSP, X-Frame-Options, HSTS, etc.)
2. 刪 App.jsx.bak (39KB)
3. 整理 .gitignore
4. 拆 App.jsx → 抽出 lib/ (lottery, icons, constants)
5. API Rate Limiting (api/_lib/rate-limit.js)

### P1 (5/5 完成)
1. Vitest 設定 + 36 個 smoke test (3 個 test 檔)
2. npm audit fix (0 vulnerabilities)
3. fetch-comments.js 精簡 (-12%)
4. lib/ 抽 utility (P0 完成)
5. src/lib/rate-limit.test.js (跟 rate-limit 一起)

### P2 (部分完成)
1. ✅ Toast 元件 (src/components/Toast.jsx)
2. ✅ Loading Skeleton (src/components/Skeleton.jsx)
3. ✅ i18n dict (src/lib/i18n.js)
4. ⏸ E2E (Playwright) — 跳過,太重
5. ⏸ Analytics — 跳過, 隱私
6. ⏸ Sentry — 跳過, 外部 dep
7. ⏸ PWA — 跳過,用戶不需要
8. ⏸ Modal ESC 關閉 — PageSelectorModal 已經有 onClose,但無 ESC
9. ⏸ Keyboard shortcut — 跳過
10. ⏸ README/SPEC rewrite — TODO
