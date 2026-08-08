# Production Deployment 完成 — 2026-08-09

## 從 local 到 production 完整路徑

**Production URL**: https://fb-giveaway-v2.vercel.app

### 三向對齊

| 來源 | SHA |
|---|---|
| Local HEAD | `24492bb8daaff16ceedb1e8f75279efde01111bf` |
| GitHub HEAD | `24492bb8daaff16ceedb1e8f75279efde01111bf` |
| Vercel production (`dpl_Be5Vf515WoeNvhj2dvhiQJJkDTXs`) | `24492bb8daaff16ceedb1e8f75279efde01111bf` |

**All aligned ✅**

### Vercel project metadata

- Project ID: `prj_IP8V3SY1ZyD5DlpTm4QTHjueAdSo` (name: `fb-giveaway-v2`)
- Team: `seans-projects-7dc76219` (team_ZXidjNihc5HAjfVw3VErrrrK)
- Framework: Vite
- Plan: Hobby
- Lambda runtime stats: `{"nodejs": 9}` (9 個 serverless functions, < 12 限制)
- DOMAIN: `fb-giveaway-v2.vercel.app` (canonical alias)

### Production deployment commits

| Commit | Message |
|---|---|
| `18cc9f3` | feat: FB OAuth + Page Selector Modal — 一鍵選粉專/選貼文/抓留言 |
| `24cba92` | docs: VERIFICATION.md (hermes verify --json PASS) + .gitignore .hermes/ |
| `24492bb` | chore: remove 4 duplicate api endpoints (Hobby plan 12-function limit) |

### Production API 行為驗證

| Endpoint | Status | 描述 |
|---|---|---|
| `GET /` | 200 | Vite SPA 正常 render |
| `GET /api/facebook/parse-post?url=...` | 200 / 422 | URL 解析 4 個格式全對 |
| `GET /api/facebook/accounts` | 400 | 缺 token → 400 |
| `GET /api/facebook/accounts?token=fake` | 400 | FB Graph 拒絕 invalid token → 400 |
| `GET /api/facebook/page-posts` | 400 | 缺 pageId → 400 |
| `GET /api/facebook/page-comments` | 400 | 缺 postId → 400 |
| `GET /api/facebook/auth` | 500 | 缺 FACEBOOK_APP_ID → 500 (**需 Sean 設定**) |
| `GET /api/draw` | 405 | POST only |

### JS bundle 驗證 (從 canonical https://fb-giveaway-v2.vercel.app/assets/index-_6qUyu7p.js)

- Size: 180.5 KB (gzip 57.7 KB)
- Contains: `/api/facebook/accounts`, `pages_show_list` scope, Graph v19.0
- No v18.0 residue

### 本次 sprint 變更

**新增**:
- `api/facebook/accounts.js` — 拉 FB 粉專列表（需 `pages_show_list` scope）
- `api/facebook/page-posts.js` — 拉粉專近期 25 篇貼文
- `api/facebook/page-comments.js` — 用 page-level token 拉指定貼文全部留言
- `src/components/PageSelectorModal.jsx` — 三欄 Modal（粉專/貼文/留言預覽）
- `.env.example` — env 範例

**修改**:
- `api/facebook/auth.js` — v18→v19, 加 `pages_show_list` scope
- `api/facebook/callback.js` — v18→v19
- `api/facebook/comments.js` — v18→v19 (已刪除)
- `api/facebook/parse-post.js` — v18→v19
- `api/fb-auth.js` — v18→v19, 加 scope (已刪除)
- `api/fb-callback.js` — v18→v19 (已刪除)
- `api/fb-comments.js` — v18→v19 (已刪除)
- `src/App.jsx` — 重寫 OAuth 走 serverless, 加 `openPageSelector`/`handlePageSelectorConfirm`, 從 URL `?fb_token=` 讀 callback
- `src/main.jsx` — v18.0→v19.0
- `src/components/PageSelectorModal.jsx` — 新增
- `vercel.json` — 不變
- `.gitignore` — 加 `.env*` + `.hermes/`

**刪除**:
- `api/fb-auth.js` (重複)
- `api/fb-callback.js` (重複)
- `api/fb-comments.js` (重複)
- `api/facebook/comments.js` (重複)
- `.env` (從 index 移除, working tree 保留)

### 仍未完成 (紅線待 Sean)

| 項目 | 為什麼 |
|---|---|
| FB App 設定 | 需去 developers.facebook.com 建 App + 拿 APP_ID + APP_SECRET |
| Vercel env 設定 | 需在 Vercel Dashboard 設 FACEBOOK_APP_ID / FACEBOOK_APP_SECRET / FACEBOOK_REDIRECT_URI |
| FB Console Valid OAuth URI | 需加 https://fb-giveaway-v2.vercel.app/api/facebook/callback |
| Notion sync | AGENTS.md 對照表沒列 facebook-comment-picker, 需 Sean 建 Notion page + 加進 sync-3way.sh 的 PROJECTS case |

---

## 為什麼 production 一開始 deploy 失敗

Vercel Hobby plan 限制每個 deployment 最多 12 個 serverless functions。我新加 3 個 (accounts/page-posts/page-comments) 後總共 13 個超過限制。

**解法**:
- 原本 repo 內有 2 套重複的 OAuth endpoint 實作（`api/fb-*.js` 跟 `api/facebook/*.js`）
- 刪除舊的 `api/fb-*.js` 3 個 + 重複的 `api/facebook/comments.js` 1 個
- 從 13 個 → 9 個 serverless functions, 過 12 限制
- 前端 src/ 只引用 `/api/facebook/*` 路徑, 刪除無 breaking change
- Vercel deployment 重新觸發 → 9 個 functions 全 READY
