# Facebook Comment Picker — Layer 2 重構設計文件
**日期：** 2026-04-07
**作者：** Alan（CTO）

---

## 1. 現況分析

### 1.1 現有架構問題
- 單頁佈局（single-page），所有控制項（匯入/篩選/結果）都在同一個 viewport
- Facebook OAuth 只有 client-side SDK 骨架，沒有 server-side OAuth 流程
- API 只有 `/api/fetch-comments`，缺少 `/api/fb-auth`、`/api/fb-callback`、`/api/draw`
- ScraperAPI 作為備用方案尚未實作
- Stepper 進度條沒有 CSS transition 動畫

### 1.2 目標
將 UI 重構為 Tab/Stepper 架構（Layer 2），支援完整的 Facebook OAuth 流程、獨立的抽獎 API，以及 ScraperAPI 備用方案。

---

## 2. 架構設計

### 2.1 前端架構（Vite + React）

```
App.jsx
├── <StepperBar>         — 頂部 Tab/Stepper 進度條（3步）
│   ├── Step 1: 匯入留言
│   ├── Step 2: 設定條件
│   └── Step 3: 抽獎結果
├── <Step1_Import>       — Facebook OAuth + URL 抓取 + 手動貼上
├── <Step2_Conditions>   — 獎品設定 + 篩選條件
└── <Step3_Results>       — 中獎名單 + 公布動畫 + 匯出
```

### 2.2 後端 API（Vercel Serverless Functions）

| 端點 | 方法 | 用途 |
|------|------|------|
| `/api/fb-auth` | GET | 發起 Facebook OAuth，redirect 到 Facebook 授權頁 |
| `/api/fb-callback` | GET | OAuth callback，交換 access_token，回傳 user token |
| `/api/fb-comments` | GET | 以 Facebook Graph API 抓取指定貼文留言（需要 token） |
| `/api/draw` | POST | 執行抽獎演算法（可指定 seed），回傳中獎名單 |
| `/api/fetch-comments` | GET | （現有）ScraperAPI + Jina.ai 備用方案 |

### 2.3 OAuth 流程（Server-side）

```
Client                    Server(API)              Facebook
  │                          │                        │
  │ GET /api/fb-auth         │                        │
  │------------------------─>│                        │
  │      302 → /dialog/oauth │                        │
  │<─────────────────────────│                        │
  │                          │                        │
  │              User grants │                        │
  │<─────────────────────────────────────────────────>│
  │                          │                        │
  │ GET /api/fb-callback?code=XXX                    │
  │───────────────────────────────────────────────────>│
  │                          │        {access_token}  │
  │                          │<───────────────────────│
  │   {token + fbUser}       │                        │
  │<─────────────────────────│                        │
```

---

## 3. UI 設計

### 3.1 Tab/Stepper 進度條

**外觀：**
- 水平排列 3 個步驟（Flexbox + gap）
- 當前步驟：亮色高亮（`bg-primary`）
- 完成步驟：顯示 ✅ 或完成標記
- 未完成步驟：暗色啞鈴（`text-warning/40`）
- 步驟之間連接線（border-top），完成部分為 `bg-primary`，有 CSS transition 動畫

**CSS transition：**
```css
.step-line-fill { transition: width 0.4s ease-in-out, background-color 0.3s; }
.step-circle { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
```

### 3.2 Step 1：匯入留言（Import Comments）

佈局：CSS Grid，2 欄（登入區 + 網址/手動區）

```
┌─────────────────────────────────────────────────────────┐
│  Step 1: 匯入留言                                       │
│  [FB Login button]  ← 點擊後發 GET /api/fb-auth         │
│  已登入：顯示大頭貼 + 名字 + 登出                         │
├─────────────────────────────────────────────────────────┤
│  抓取方式：                                              │
│  ○ Facebook OAuth（需登入，抓取已授權粉專的留言）         │
│  ○ 貼文網址（ScraperAPI/Jina.ai 備用）                  │
│  ○ 手動貼上（直接貼留言名單）                            │
├─────────────────────────────────────────────────────────┤
│  [URL 輸入框] [示範網址] [抓取按鈕]                      │
│  -或-                                                   │
│  [大文字 textarea：王小明 | 我要抽大獎]                  │
├─────────────────────────────────────────────────────────┤
│  [下一步：設定抽獎條件 →]                               │
└─────────────────────────────────────────────────────────┘
```

### 3.3 Step 2：設定抽獎條件（Set Conditions）

```
┌─────────────────────────────────────────────────────────┐
│  Step 2: 設定抽獎條件                                    │
├────────────────────────┬────────────────────────────────┤
│  獎品設定               │  篩選條件                      │
│  [獎品 textarea]        │  [重複處理 select]             │
│  頭獎 | 1               │  同名只留一次                  │
│  貳獎 | 2               │  [排除關鍵字 input]            │
│  參加獎 | 3             │  [只抽符合關鍵字 input]        │
│  ────────────           │  [黑名單 input]               │
│  抽出名額 [number]      │  [抽獎種子 input]              │
│  Seed: [text]           │                                │
├────────────────────────┴────────────────────────────────┤
│  候選名單預覽（共 N 位，符合條件）                        │
│  [卡片列表：姓名 + 留言摘要]                              │
│                                                         │
│  [上一步] [開始抽獎 →]                                   │
└─────────────────────────────────────────────────────────┘
```

### 3.4 Step 3：抽獎結果（Draw Result）

```
┌─────────────────────────────────────────────────────────┐
│  Step 3: 抽獎結果                                        │
│  [已抽出 N 位] [Seed: xxx] [重新抽] [匯出] [複製結果]    │
├─────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐                 │
│  │ 🎁 頭獎  │ │ 🎁 貳獎  │ │ 🎁 參加獎 │                 │
│  │ 王小明   │ │ 陳小華   │ │ 林小美   │                 │
│  │ (comment)│ │(comment) │ │(comment) │                 │
│  └─────────┘ └─────────┘ └─────────┘                 │
├─────────────────────────────────────────────────────────┤
│  [中獎公布按鈕] → 開啟全屏揭曉 overlay                   │
│                                                         │
│  [重新編輯條件] [開始新抽獎]                             │
└─────────────────────────────────────────────────────────┘
```

### 3.5 CSS Grid / Flexbox 佈局

- Stepper：Flexbox（`flex-row`，`items-center`，`gap`）
- Step 1：CSS Grid（`grid-cols-1 md:grid-cols-2`，`gap-6`）
- Step 2：CSS Grid（`grid-cols-2`，`gap-4`）
- Step 3：CSS Grid（`grid-cols-3` winner cards，`grid-cols-1` for mobile）
- Container：`max-w-5xl mx-auto px-4`

### 3.6 進度條 CSS Transition

```css
/* Stepper 連接線過渡 */
.step-connector-fill {
  height: 2px;
  background: linear-gradient(90deg, var(--primary) 0%, var(--primary) var(--fill, 0%), var(--warning/10) var(--fill, 0%));
  transition: background 0.5s ease;
}

/* Step 完成時的彈跳動畫 */
.step-circle.completed {
  animation: stepComplete 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes stepComplete {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

/* 內容區過渡 */
.step-content {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.step-content.hidden {
  opacity: 0;
  transform: translateY(8px);
  pointer-events: none;
}
```

---

## 4. API 規格

### 4.1 GET /api/fb-auth

**Query Parameters：**
- `redirect_uri`（可選，預設為 Vercel URL + /api/fb-callback）

**行為：**
1. 從 `FACEBOOK_APP_ID` 建 Facebook OAuth URL
2. 302 redirect 到 `https://www.facebook.com/v18.0/dialog/oauth`
3. Scope：`pages_read_engagement,public_profile`

**Response：** 302 Redirect

### 4.2 GET /api/fb-callback

**Query Parameters：**
- `code`（required）：Facebook 回傳的 authorization code
- `state`（可選）：CSRF token

**行為：**
1. 用 `code` + `FACEBOOK_APP_ID` + `FACEBOOK_APP_SECRET` 換 `access_token`
2. 向 `/me` 查詢用戶資料
3. 回傳 `{ accessToken, user: { name, id, picture } }`

**Response：**
```json
{
  "accessToken": "xxx",
  "user": { "name": "用戶名", "id": "123", "picture": "url" }
}
```

### 4.3 GET /api/fb-comments

**Query Parameters：**
- `url`（required）：Facebook 貼文網址
- `token`（required）：User access token（需要 `pages_read_engagement`）

**行為：**
1. 從 URL 解析 post ID
2. 呼叫 Graph API `/v18.0/{post_id}/comments`（含分頁）
3. Optional：呼叫 `/v18.0/{post_id}` 取得貼文標題

**Response：**
```json
{
  "ok": true,
  "postTitle": "貼文標題",
  "comments": [{ "name": "姓名", "comment": "留言內容", "createdAt": "ISO" }],
  "totalCount": 42
}
```

### 4.4 POST /api/draw

**Request Body：**
```json
{
  "participants": [{ "name": "王小明", "comment": "我要抽獎" }],
  "prizes": [{ "name": "頭獎", "count": 1 }, { "name": "參加獎", "count": 3 }],
  "seed": "optional-seed-string",
  "filters": {
    "excludeKeywords": ["測試"],
    "requiredKeywords": ["抽"],
    "blacklistNames": ["周大成"],
    "dedupeMode": "name"
  }
}
```

**Response：**
```json
{
  "winners": [{ "name": "王小明", "comment": "...", "prize": "頭獎" }],
  "drawSeed": "abc123",
  "drawnAt": "ISO"
}
```

### 4.5 ScraperAPI 備用方案

當 Graph API 無法使用（無 token 或 token 過期）時：
1. 主：`https://r.jina.ai/http://{url}` （現有實作）
2. 備用：`https://api.scraperapi.com?api_key={SCRAPERAPI_KEY}&url={url}`

---

## 5. 環境變數

```env
# Facebook OAuth
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_REDIRECT_URI=https://your-app.vercel.app/api/fb-callback

# Facebook Page Access Token (for public page fetching)
FACEBOOK_PAGE_ACCESS_TOKEN=

# Backup scraper
SCRAPERAPI_KEY=
JINA_API_KEY=
```

---

## 6. Notion 整合

完成開發並部署後，更新 Notion 任務頁面的 Git 欄位：
- **資料庫 ID：** `31a449ca-65d8-802e-ba9a-000b3f29c6b2`（新！舊ID 已失效）
- **更新的欄位：** Git（URL，指向 GitHub commit/deployment）
- **更新方式：** PATCH `/v1/pages/{page_id}`，設定 `{"Git": {"url": "https://github.com/..."}}`

---

## 7. 實作優先順序

1. ✅ 設計文件（本文）
2. 建立 `/api/fb-auth` 和 `/api/fb-callback`
3. 重構 `/api/fb-comments`（整合 ScraperAPI 備用）
4. 建立 `/api/draw`
5. 重構 UI 為 Stepper 架構（Step1/2/3 元件）
6. CSS transition 動畫（Stepper 進度條）
7. 發版並更新 Notion Git 欄位
8. 通知 Sophia 驗收
