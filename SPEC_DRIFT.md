

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


## Appendix C: Drift (v2.5) — 2026-08-16 OAuth 困境 + GitHub Pages 備援

**情境**: 4 小時 OAuth debug, 最後發現 `pages_show_list` + `pages_read_engagement` 需要 Meta App Review 才能用 (Advanced Access)

### 1. OAuth 技術狀態 (2026-08-16)

| 項目 | SPEC | 實際 |
|---|---|---|
| FB Login OAuth flow | ✅ v1 完整 | ⚠️ 部分 work — 同意頁可達, 但按同意後 "Invalid Scopes" 拒絕 |
| App ID | 假設有 | ✅ 4427528560848361 (Comment Flow App) |
| App Domains 設 `*.vercel.app` | ✅ v2.3 | ❌ **Meta 拒絕接受** (Vercel subdomain 限制) |
| App Domain 改用 `*.github.io` | ✅ v2.5 | ✅ 已加 `openclawsean024-create.github.io` |
| Valid OAuth Redirect URI | ✅ v2.3 | ✅ 已設 |
| Facebook Login 產品啟用 | ✅ v2.5 | ✅ 已啟用 |
| `pages_show_list` Advanced Access | ❌ dev mode 不需要 | ⚠️ Meta 改政策, dev mode 也需 App Review |
| `pages_read_engagement` Advanced Access | ❌ dev mode 不需要 | ⚠️ Meta 改政策, dev mode 也需 App Review |

### 2. 新增部署: GitHub Pages 純前端版

| 項目 | 內容 |
|---|---|
| **目錄** | `/Volumes/MyDsik(APFS)/Hermes Agent/Hermes Project/comment-flow-web/` |
| **GitHub repo** | `https://github.com/openclawsean024-create/comment-flow-web` |
| **GitHub Pages URL** | `https://openclawsean024-create.github.io/comment-flow-web/` |
| **架構** | 純前端 React + Vite + FB JS SDK (no serverless) |
| **HEAD** | `fe5917f` (FB SDK script order fix) |
| **Vercel 版本** | `fb-giveaway-v2.vercel.app` (保留, serverless 版本) |

### 3. OAuth 流程改動 (v2.4 → v2.5)

**原本 (v2.4)**:
```
handleFbLogin → window.location.href = '/api/facebook/auth' (serverless OAuth code exchange)
```

**現在 (v2.5 純前端)**:
```
handleFbLogin → window.FB.login(callback, {scope: 'pages_show_list,...'}) (FB JS SDK)
```

### 4. 待辦 (next sprint)

- [ ] 提交 Meta App Review 拿 `pages_show_list` advanced access (1-7 天)
- [ ] App Review demo 影片 + 截圖 (Sean 做)
- [ ] App Review 通過後切 Live Mode
- [ ] 或: 短期改用 public_profile + email scope (user-level, 不需 advanced access)
- [ ] 或: 放棄 OAuth, 改純貼上 + CSV 版本 (Option C)
