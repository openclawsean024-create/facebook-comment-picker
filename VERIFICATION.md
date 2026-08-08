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
