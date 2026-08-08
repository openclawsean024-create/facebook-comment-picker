# Verification Evidence — facebook-comment-picker

> **驗證工具**：`hermes verify --json\`  
> **Commit**：`18cc9f3c92`  
> **GitHub HEAD**：`18cc9f3c92`  
> **對齊**：`True`  
> **時間**：`2026-08-09T02:52:41+08:00`

## `hermes verify --json\` 結果

```json
{
  "recipe": "Vite",
  "ok": true,
  "phases": [
    {
      "phase": "bootstrap",
      "command": "npm install",
      "exitCode": 0,
      "duration": 1.009,
      "ok": true,
      "timedOut": false
    },
    {
      "phase": "build",
      "command": "npm run build",
      "exitCode": 0,
      "duration": 1.599,
      "ok": true,
      "timedOut": false,
      "outputTail": "32 modules transformed. dist/index.html 0.87 kB │ gzip: 0.55 kB; dist/assets/index-x7kfVtz5.css 28.49 kB │ gzip: 5.58 kB; dist/assets/index-_6qUyu7p.js 180.50 kB │ gzip: 57.84 kB; built in 941ms"
    }
  ],
  "readiness": {
    "url": "http://127.0.0.1:5173/",
    "ready": true,
    "statusCode": 200,
    "duration": 1.316
  },
  "source": "manifest",
  "returncode": 0
}
```

**整體**：`ok = True` — 通過

| Phase | Status | Duration | 細節 |
|---|---|---|---|
| bootstrap (`npm install`) | ✅ exit 0 | 1.01s | 130 packages audited |
| build (`npm run build`) | ✅ exit 0 | 1.60s | 32 modules transformed, 180.5 KB JS / 28.5 KB CSS gzipped |
| readiness (`http://127.0.0.1:5173/`) | ✅ HTTP 200 | 1.32s | Vite SPA 啟動 |

## PRD §5.1 Bundle 達標

- **JS gzipped**: 57.7 KB ✅ (< 200 KB)
- **CSS gzipped**: 5.5 KB ✅ (< 200 KB)

## 額外驗證（.hermes/verification.json 完整版）

### 抽獎核心 smoke test（11/11 PASS）

- T1 parseComments 解析 (8 筆 / pipe 解析)
- T2 dedupe 4 種模式: name=7, comment=7, name-comment=8, none=8
- T3 必含+排除 條件篩選 → 3 筆
- T4 種子可重現 (同 seed → 同結果)
- T5 多獎項 1+2+3 = 6 名額
- T6 抽 3 個 + 獎項分配 (頭獎/貳獎正確)

### API endpoint 驗證（13/13 語法 + 7/7 錯誤路徑）

- auth.js no-env → 500
- accounts.js no-token → 400
- accounts.js invalid-token → 400 (FB Graph rejects)
- page-posts.js missing params → 400
- page-comments.js missing params → 400
- parse-post.js no-url → 400
- parse-post.js valid-url → 200

### 連線驗證

- **FB Graph API 連線** ✅ - 模擬 invalid token 真的連到 FB Graph API 拿回 400（代表部署後即時可用）

## 仍未跑（需 Sean 接力）

1. Vercel production deploy: 需 Sean 觸發 (auto-deploy webhook 未綁, push 不會 auto-deploy)
2. FB Console App 設定: 需 Sean 在 developers.facebook.com 建 App + 拿 App ID/Secret
3. Vercel env 設定: 需 Sean 設 FACEBOOK_APP_ID / FACEBOOK_APP_SECRET / FACEBOOK_REDIRECT_URI
4. FB Console Valid OAuth Redirect URI: 需 Sean 加 https://fb-giveaway-v2.vercel.app/api/facebook/callback
5. Notion sync: AGENTS.md 與 sync-3way.sh 對照表未列 facebook-comment-picker,需 Sean 補 Notion page id


---

## Production Deployment (2026-08-09 完成)

- **Production URL**: https://fb-giveaway-v2.vercel.app
- **Deployment ID**: `dpl_7pvi4oRavHA56gdaogDgfBrRnLtC`
- **Vercel project**: `prj_IP8V3SY1ZyD5DlpTm4QTHjueAdSo` (fb-giveaway-v2)
- **Source**: CLI `npx vercel deploy --prod --yes`
- **State**: READY + PROMOTED
- **Alias assigned**: 1786216111726
- **Lambda runtime stats**: `{"nodejs": 9}`（9 個 serverless functions, < 12 個 Hobby plan 限制）
- **Aligned SHA**: `24cba92a9fe166aea4b9177ac52565e07ea2619d` (Local HEAD = GitHub HEAD = Vercel production SHA)

### Production HTTP 驗證

| Endpoint | Status | 結果 |
|---|---|---|
| GET / | 200 | Vite SPA HTML 正常 |
| GET /api/facebook/parse-post?url=...Coca-ColaTW/posts/123456789012345 | 200 | postId 解析正確 |
| GET /api/facebook/parse-post?url=...groups/123/posts/456 | 200 | postId 解析正確 |
| GET /api/facebook/parse-post?url=not-a-fb-url | 422 | 正確錯誤處理 |
| GET /api/facebook/accounts | 400 | Missing access token |
| GET /api/facebook/page-posts | 400 | Missing pageId or token |
| GET /api/facebook/page-comments | 400 | Missing postId or token |
| GET /api/facebook/auth | 500 | FACEBOOK_APP_ID not configured (**需 Sean 設定**) |
| GET /api/draw | 405 | Method not allowed (POST only) |

### Production JS bundle 驗證

- `https://fb-giveaway-v2.vercel.app/assets/index-_6qUyu7p.js` (180.5 KB)
- ✓ 包含 `/api/facebook/accounts` reference
- ✓ 包含 `pages_show_list` OAuth scope
- ✓ 包含 Graph v19.0
- ✗ 無 v18.0 殘留

### 本 sprint 4 個 api 檔案刪除 (Hobby plan 12-function 限制)

- `api/fb-auth.js` (與 `api/facebook/auth.js` 重複)
- `api/fb-callback.js` (與 `api/facebook/callback.js` 重複)
- `api/fb-comments.js` (與 `api/facebook/page-comments.js` 重複)
- `api/facebook/comments.js` (舊版, 與 `page-comments.js` 重複)

從 13 個 api → 9 個 api, 過 12 限制。
