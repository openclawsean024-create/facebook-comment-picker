# FB 留言抽獎工具 v2.2 — 規格計劃書 v2.2.1

> 版本：v2.2.1｜更新日期：2026-07-11｜維護者：Sophia (CPO) for Sean
> 對接技術：Alan (CTO) + Hermes Agent
> 對接 Repo：https://github.com/openclawsean024-create/facebook-comment-picker
> 對接產線：https://fb-giveaway-v2.vercel.app

---

## 1. 產品概述 (Product Overview)

### 1.1 問題陳述 (Problem Statement)

粉絲專頁小編辦留言抽獎現在的痛點：

| 替代方案 | 痛點 |
|---|---|
| 手動複製留言 + Excel | 步驟多、易出錯 |
| Gleam.io 商用抽獎工具 | 月費 US$5-100、介面複雜、學習曲線高 |
| 既有免費抽獎工具 | 功能陽春、無去重、無篩選 |
| AI Bot 自動抓 | 違反 FB 政策、帳號會被封 |

**Comment Flow 解法**：3 種導入方式（貼上留言 / CSV / 書籤插件）+ 去重 + 條件篩選 + 隨機抽出 + 結果匯出 + 種子可重現 + **完全免費**。

### 1.2 目標使用者 (User Personas)

| 角色 | 規模（台灣 + 全球華文）| 月情境 | 痛點強度 | ARPU/年 |
|---|---|---|---|---|
| 📱 FB 粉專小編 | ~10 萬 | 每月 1-3 次抽獎 | 中 | NT$0 |
| 📷 IG 帳號經營者 | ~5 萬 | 同上 | 中 | NT$2,988 |
| 🛒 微商 / 個人賣家 | ~20 萬 | 行銷活動抽獎 | 低（工具非主流程）| NT$0 |
| 🏢 行銷公司 | ~3,000 | 客戶代辦抽獎 | 中 | NT$8,988 |
| 📊 抽獎 SaaS 平台 | ~500 | 想白標工具 | 高（想 B2B2C）| NT$14,988 |

**核心使用者 = FB 粉專小編 + IG 帳號經營者**。這兩個族群規模大 + 每月定期辦抽獎 + 對工具有真切需求。

### 1.3 核心價值主張 (Value Proposition)

> **「完全免費的留言抽獎工具 — 3 種導入、智慧篩選、隨機抽出、種子可重現。」**

**與替代方案的差異**：

| 替代方案 | 缺點 | 我們差異 |
|---|---|---|
| Gleam.io | 月費 5-100 USD、複雜介面 | **完全免費、3 種導入、3 分鐘完成** |
| 手動複製 + Excel | 易出錯、隨機不公 | **種子 RNG 可重現** + 同名去重 + 排除關鍵字 |
| 線上免費抽獎（mrbeam 等）| 功能陽春 | **完整 UI（Linear/Vercel 等級）** + 去重 + 篩選 |
| FB Bot 自動抓 | 違反 FB 政策 | **書籤插件使用者自行負責、不開 Bot** |
| 自寫抽獎 JS | 要工程師 | **0 技術、貼上就抽** |

### 1.4 商業目標 (KPIs / OKRs)

| 時間 | 目標 | 量化指標 |
|---|---|---|
| 3 個月（M3）| 完成 v1 完整 + Chrome 擴充 | 月訪 10K |
| 6 個月（M6）| IG 支援 + LINE 推播 | 月訪 50K + 200 進階版付費 |
| 12 個月（M12）| 商用版 + 多帳號 | NT$200K MRR + 20 個白標合作 |
| 18 個月（M18）| 華文抽獎工具第一品牌 | NT$500K MRR |

**Unit Economics**：
- 進階版 NT$299/月 個人 ARPU = NT$2,988/年
- 商用版 NT$1,499/月 團隊 ARPU = NT$14,988/年
- 企業版 NT$4,999/月 品牌 ARPU = NT$59,988/年
- 廣告主（抽獎相關電商）NT$5K-30K/月

### 1.5 ⭐ Non-Goals（v2.2.1 明確不做）

- ❌ **不做 Meta API 自動整合**（書籤插件已足） — FB 政策禁止、帳號被封風險
- ❌ **不做抽獎活動報名頁面**（純隨機工具） — 變成表單 SaaS 離題
- ❌ **不做法律見證 / 公證**（純技術工具） — 法務需律師、不進
- ❌ **不做跨境抽獎**（先台灣 + 繁中） — GDPR / 各國稅務複雜
- ❌ **不做 AI 自動留言辨識**（不做 LLM 抽獎） — 變成另一個產品
- ❌ **不做多語系**（v1 繁中） — v2 才加英文簡中
- ❌ **不做廣告聯播 / affiliate link**（純工具立場） — 立場中立
- ❌ **不做個人資料收集**（匿名工具） — 法規風險

---

## 2. 使用者場景與流程

### 2.1 使用者流程圖

```
進入首頁 (fb-giveaway-v2.vercel.app)
  ↓
選導入方式：
  ├─ 方法 A：貼上留言（手動）
  │   └─ 1 行 1 留言："王小明 | 我要抽大獎" 格式
  ├─ 方法 B：CSV 匯入
  │   └─ 從 FB 後台匯出 CSV → 上傳
  └─ 方法 C：書籤插件 / Chrome 擴充
       └─ 一鍵抓 FB 留言 → 複製到剪貼簿 → 自動帶入
  ↓
設定篩選條件：
  ├─ 排除關鍵字（"測試" / "取消" / "機器人"）
  ├─ 必含關鍵字（"抽"）
  ├─ 黑名單（特定帳號排除）
  └─ 同名去重模式（name / comment / name-comment / none）
  ↓
設定獎項（多獎項）：
  ├─ 頭獎 1 名
  ├─ 二獎 2 名
  └─ 參加獎 5 名
  ↓
選種子 RNG 策略：
  ├─ 自動隨機（不可重現）
  └─ 自設 seed（可重現、for 法律見證）
  ↓
按「抽出」
  ↓
抽獎動畫（轉盤 / 名單滾動）
  ↓
結果匯出：
  ├─ 中獎名單（CSV / JSON）
  ├─ 留言截圖
  └─ 一鍵複製
```

### 2.2 關鍵用戶故事

```
US-1（核心場景）
As a FB 粉專小編
I want 貼上 500 筆留言、按「抽」
So that 30 秒內拿到 3 位中獎者
And 我可以一鍵複製到他 FB 公告

US-2（去重場景）
As a FB 小編
I want 同人重複留言只算一次
So that 抽獎更公平、避免 wash 帳號
And 設定 4 種去重模式選

US-3（重現性）
As a 行銷公司代辦
I want 設固定 seed
So that 同樣的留言 + seed = 同樣的結果
And 若客訴可以重現證明隨機

US-4（書籤插件）
As a FB 小編
I want 一鍵從 FB 抓留言
So that 我不必手動複製 500 行
And Chrome 擴充套件 v1.1 自動捲動抓全部
```

### 2.3 邊界場景 (Edge Cases)

| 場景 | 處理 |
|---|---|
| 留言有 emoji / 罕見字 | UTF-8 全支援、避免切割錯 |
| 多語系留言（中英混合）| 全部視為字串、不做斷詞 |
| CSV 編碼（UTF-8 / Big5）| 自動偵測、給預覽再匯入 |
| 抽獎種子相同但留言改變 | 結果必不同（用 hashSeed 編入） |
| 抽出數 > 留言數 | 跳出錯誤、限制抽出數 ≤ 留言數 |
| 1 個留言 + seed | 必定抽到他 |

---

## 3. 功能性需求 (Functional Requirements)

### 3.1 MVP（必做，P0）

| ID | 功能 | 狀態 |
|---|---|---|
| F-001 | 3 種導入（貼上 / CSV / 書籤插件）| ✅ App.jsx + api/ |
| F-002 | 同名去重 4 種模式 | ✅ App.jsx |
| F-003 | 條件篩選（必含/排除/黑名單）| ✅ App.jsx |
| F-004 | 多獎項（頭/二/三/參加）| ✅ parsePrizes 函式 |
| F-005 | 種子 RNG（Mulberry32）| ✅ hashString + mulberry32 |
| F-006 | 抽獎動畫 | ✅ App.jsx React state |
| F-007 | 結果匯出（CSV / JSON / 複製）| ✅ |
| F-008 | 37 個單元測試 | ✅ |
| F-009 | Vercel production URL | ✅ https://fb-giveaway-v2.vercel.app |
| F-010 | 書籤插件 bookmarklet | ✅ |
| F-011 | Chrome 擴充 v1.1（自動捲動抓全部）| ✅ Notion 備註 |
| F-012 | UI 達 Linear/Vercel 等級 | ✅（Notion 認證）|
| F-013 | 工具頁自動偵測剪貼簿匯入 | ✅ |
| F-014 | FB OAuth + Graph API | ✅ api/facebook/{auth,callback,comments}.js |

### 3.2 v2（加值，P1）

| ID | 功能 | 目標版本 |
|---|---|---|
| F-101 | IG 留言抽獎支援 | Sprint 1 |
| F-102 | LINE 推播中獎通知 | Sprint 1 |
| F-103 | 加權抽獎（VIP 用戶高機率）| Sprint 2 |
| F-104 | 抽獎活動報名管理（活頁 + URL）| Sprint 2 |
| F-105 | 商用版多帳號 dashboard | Sprint 2 |
| F-106 | 企業版白標 | Sprint 3 |
| F-107 | 企業版 API | Sprint 3 |
| F-108 | 中英簡繁切換 | Sprint 3 |
| F-109 | Notion / Slack 整合（中獎名單自動同步）| Sprint 4 |
| F-110 | 中獎名單自動篩選垃圾帳號 | Sprint 4 |

### 3.3 v3（探索，P2）

| ID | 功能 |
|---|---|
| F-201 | AI 自動分類留言（業配 / 真實留言）|
| F-202 | 多平台整合（X / TikTok / 小紅書）|
| F-203 | 抽獎 NFT 化（區塊鏈隨機）|

### 3.4 ⭐ Acceptance Criteria (Given/When/Then)

#### AC-001 [F-001] 3 種導入成功
- **Given** 用戶開工具頁
- **When** 用 3 種方法之一導入留言
- **Then** 留言數計數正確顯示、樣本可預覽
- **驗證法**：30 位測試者、3 種各 10 位

#### AC-002 [F-002] 同名去重 4 模式正確
- **Given** 留言「王小明」出現 3 次
- **When** 選「name」模式
- **Then** 只剩 1 個「王小明」、其他去掉
- **And** 4 種模式行為正確（name / comment / name-comment / none）
- **驗證法**：100 留言樣本 × 4 模式 = 400 對照

#### AC-003 [F-005] 種子 RNG 可重現
- **Given** 留言 10 筆 + seed "draw-2026-07-11"
- **When** 按抽出
- **Then** 結果固定不變
- **And** 重整頁面再抽 → 同樣結果
- **驗證法**：10 種 seed × 100 留言各測 5 次

#### AC-004 [F-006] 抽獎動畫流暢
- **Given** 留言 100 筆
- **When** 按抽獎
- **Then** 動畫 3-5 秒、不卡頓
- **驗證法**：3 種瀏覽器 + 4 種裝置

#### AC-005 [F-007] 結果匯出可下載
- **Given** 抽完獎
- **When** 按「匯出 CSV」/「複製 JSON」
- **Then** 檔案下載到本地、剪貼簿更新
- **驗證法**：3 種瀏覽器

#### AC-006 [F-008] 37 個單元測試全綠
- **Given** npm run test
- **When** 跑測試
- **Then** 37 個全綠、0 fail
- **驗證法**：本地 + CI 兩處驗

#### AC-007 [F-009] Vercel production 200
- **Given** 訪問 https://fb-giveaway-v2.vercel.app
- **When** GET /
- **Then** 200 OK、首頁載入 < 3s
- **驗證法**：5 種瀏覽器

#### AC-008 [F-011] Chrome 擴充抓全部留言
- **Given** 1 篇 FB 貼文 500 留言
- **When** 點擴充「抓留言」
- **Then** 自動捲動到最底、複製全部到剪貼簿
- **驗證法**：3 篇貼文 × 100-1000 留言

#### AC-009 [F-014] FB OAuth 流程
- **Given** 用戶按「FB 帳號登入」
- **When** 完成 OAuth
- **Then** 拿到 token、可拉留言
- **驗證法**：oauth flow 測試

#### AC-010 [F-101] IG 抽獎
- **Given** IG 留言格式（含 emoji + IG handle）
- **When** 用 IG 模式抽
- **Then** parse 正確、抽獎正常
- **驗證法**：30 篇 IG 貼文樣本

---

## 4. 系統設計 (System Design)

### 4.1 技術棧 (Tech Stack)

| 層 | 選擇 | 已實作? | 理由 |
|---|---|---|---|
| 框架 | Vite 5 + React 18 | ✅ | 純前端 SPA |
| 語言 | JavaScript ES2022 | ✅ | 足夠、不用 TS |
| UI | Tailwind 3 | ✅ | utility-first |
| 抽獎演算法 | Mulberry32 PRNG | ✅ | 種子 RNG、可重現 |
| 留言解析 | 自寫 parser (split \|) | ✅ | 輕量、可讀 |
| FB OAuth | Facebook Graph API + OAuth 2.0 | ✅ | api/facebook/{auth,callback,comments}.js |
| CSV 匯入 | api/import/csv.js | ✅ | UTF-8 自動偵測 |
| 書籤插件 | JavaScript bookmarklet | ✅ | 純前端抓 DOM |
| Chrome 擴充 | manifest v3 + content scripts | ✅ | 自動捲動 |
| 部署 | Vercel | ✅ | auto-deploy + 無伺服器函式 |
| 測試 | Vitest | ✅ | 37 個單元測試 |

### 4.2 系統架構圖

```mermaid
graph TB
    User[小編 / 行銷] -->|Browser| FB[Facebook 貼文]
    User -->|HTTPS| Vercel[Vercel Edge]

    Vercel --> Index[/index.html<br/>SPA]
    Index --> App[App.jsx<br/>46KB React]

    App --> Storage[localStorage<br/>fb_comments_v1]
    App --> Parse[parseComments<br/>split | or ,]
    App --> Filters[4 種篩選<br/>name/comment/name-comment/none]
    App --> Hash[hashString<br/>FNV-1a]
    App --> RNG[mulberry32<br/>PRNG]
    App --> Draw[抽獎演算法<br/>Mersenne]
    App --> Export[CSV / JSON<br/>複製 / 下載]

    FB --> Plugin[Chrome 擴充 v1.1<br/>自動捲動 + 剪貼簿]
    FB --> Bookmarklet[書籤插件<br/>頁面 inline]
    Plugin --> Storage
    Bookmarklet --> Storage

    App -->|OAuth| FBAPI[Facebook Graph API]
    FBAPI -->|callback| Vercel
    Vercel --> FacebookAPI[api/facebook/<br/>auth + callback + comments]
    FBAPI --> App

    App -->|POST /api/draw| Serverless[Vercel Serverless<br/>api/draw.js]
    Serverless --> RNG

    classDef v1 fill:#e0f2fe,stroke:#0284c7,color:#0c4a6e
    classDef v2 fill:#fef3c7,stroke:#d97706,color:#78350f
    classDef third fill:#f3e8ff,stroke:#7c3aed,color:#581c87
    class User,Vercel,Index,App,Storage,Parse,Filters,Hash,RNG,Draw,Export,Serverless,Plugin,Bookmarklet v1
    class FBAPI,FacebookAPI v2
    class FB third
```

ASCII 補充圖：

```
┌───────────────────────────────────────────────────────┐
│           Vercel Edge + Serverless Functions           │
│  ┌──────────┐ ┌──────────────┐ ┌──────────────────┐  │
│  │ index    │ │ /api/draw    │ │ /api/facebook/   │  │
│  │ + App.jsx│ │ Mulberry32   │ │ auth+callback    │  │
│  │ 46KB     │ │ PRNG         │ │ +comments+parse  │  │
│  └──────────┘ └──────────────┘ └──────────────────┘  │
└───────────────────────────────────────────────────────┘
       │             │              │
       ▼             ▼              ▼
┌────────────────────────────────────────────────┐
│  Pure-Client + Chrome Extension + Bookmarklet │
│  • parseComments + 4 filters                   │
│  • localStorage fb_comments_v1                 │
│  • hashSeed + mulberry32 PRNG                   │
│  • CSV / JSON export                           │
│  • Facebook Graph API OAuth                     │
└────────────────────────────────────────────────┘
                       │
                       ▼
              ┌──────────────────┐
              │   Facebook       │
              │   Comments API   │
              └──────────────────┘
```

### 4.3 資料模型 (Data Model)

#### v1（純 localStorage）
```
localStorage fb_comments_v1:
{
  rawInput: "王小明 | 我要抽大獎\n陳小華 | 我要...",
  parsed: [
    { name: "王小明", comment: "我要抽大獎", age: "" },
    { name: "陳小華", comment: "Logitech 福袋買起來", age: "" },
    ...
  ],
  filters: {
    excludeKeywords: ["測試", "取消"],
    requiredKeywords: ["抽"],
    blacklistNames: ["周大成"],
    dedupeMode: "name"  // name | comment | name-comment | none
  },
  prizes: [
    { name: "頭獎", count: 1 },
    { name: "參加獎", count: 3 }
  ],
  seed: "draw-2026-07-11",
  history: [
    { timestamp: 1719158400000, seed: "...", winners: [...] }
  ]
}

URL 參數（分享種子結果）：
  /?seed=draw-2026-07-11&comments=base64(...)&filters=base64(...)
```

#### v2（Supabase + Auth + 多帳號）
```prisma
model Organization {
  id        String   @id @default(uuid())
  ownerId   String
  name      String
  plan      OrgPlan @default(FREE)
  stripeCustomerId String? @unique
  members   OrgMember[]
  giveaways Giveaway[]
  createdAt DateTime @default(now())
}

model OrgMember {
  id        String   @id @default(uuid())
  orgId     String
  userId    String
  role      OrgRole  @default(MEMBER)
  org       Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  user      User @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([orgId, userId])
}

model Giveaway {
  id          String   @id @default(uuid())
  orgId       String
  name        String   // 「2026 母親節抽獎」
  postUrl     String   // FB 貼文 URL
  status      GiveawayStatus @default(DRAFT)
  sourceMode  SourceMode  // MANUAL | CSV | BOOKMARKLET | FB_API
  totalComments Int
  prizeJson   Json     // [{name, count}]
  filtersJson Json     // 篩選 + 黑名單
  seed        String?
  winnersJson Json?
  notifyLine Boolean @default(false)
  createdAt   DateTime @default(now())
  org         Organization @relation(fields: [orgId], references: [id])
  @@index([orgId])
}

model NotificationLog {
  id        String   @id @default(uuid())
  giveawayId String
  channel   String   // "line" | "email"
  recipient String
  message   String
  status    String   // "pending" | "sent" | "failed"
  sentAt    DateTime?
  @@index([giveawayId])
}

model WhiteLabel {
  id        String   @id @default(uuid())
  orgId     String   @unique
  brandName String
  logoUrl   String?
  primaryColor String  // "#hex"
  customDomain String? @unique
  createdAt DateTime @default(now())
}

enum OrgPlan { FREE, BASIC, COMMERCIAL, ENTERPRISE }
enum OrgRole { OWNER, ADMIN, MEMBER, VIEWER }
enum GiveawayStatus { DRAFT, RUNNING, COMPLETED, CANCELED }
enum SourceMode { MANUAL, CSV, BOOKMARKLET, FB_API }
```

### 4.4 API 規格 (REST endpoints)

| Method | Path | Auth | 用途 | 對應 AC |
|---|---|---|---|---|
| POST | /api/draw | Optional | 抽獎演算法 | AC-003 |
| POST | /api/import/csv | Optional | CSV 匯入 | F-001 |
| GET | /api/facebook/auth | Public | FB OAuth 起點 | F-014 |
| GET | /api/facebook/callback | Public | FB OAuth callback | F-014 |
| GET | /api/facebook/comments | Required (FB token) | 拉 FB 留言 | F-014 |
| POST | /api/facebook/parse-post | Required | 解析單篇貼文 | F-014 |
| POST | /api/stripe/checkout | Required | Org 訂閱商用版 | F-105 |
| POST | /api/stripe/webhook | Stripe sig | 訂閱 / 退款處理 | F-105 |
| POST | /api/notify/line | Required (org) | LINE 推播中獎 | F-102 |
| GET | /api/org/giveaways | Required (org) | 活動列表 | F-104 |
| POST | /api/org/giveaways | Required (org) | 建立活動 | F-104 |
| PATCH | /api/org/giveaways/[id] | Required (org) | 編輯活動 | F-104 |
| DELETE | /api/org/giveaways/[id] | Required (org) | 刪除活動 | F-104 |
| GET | /api/whitelabel/[domain] | Optional | 查白標 config | F-106 |
| POST | /api/ig/comments | Required (IG) | IG 拉留言 | F-101 |

#### Error Codes
詳見 §10.4

---

## 5. 非功能性需求 (Non-Functional Requirements)

### 5.1 性能指標 (Performance)

| 指標 | 目標 | 量測法 |
|---|---|---|
| LCP 首頁 | < 1.5s (純靜態 SPA) | Vercel Web Vitals |
| TTI | < 2s | Lighthouse |
| 100 留言抽獎 | < 100ms | JS 計時 |
| 1000 留言抽獎 | < 500ms | JS 計時 |
| Bundle size | < 200KB gzipped | vite build |
| 1 萬留言抽獎 | < 3 秒 | JS 計時 |

### 5.2 安全與隱私

- 純前端：留言資料全在 localStorage
- FB token 不存 server（純 client）
- Webhook 驗簽
- 不存中獎者個資在 server（除非進活動紀錄）
- GDPR：使用者一鍵刪除 localStorage

### 5.3 ⭐ 降級機制 (Graceful Degradation)

| 失敗服務 | 掛掉情境 | 降級行為（切換到）| 用戶感受 |
|---|---|---|---|
| Facebook Graph API | Graph API 5xx / OAuth revoke 掛掉 | fallback 到書籤插件抓取 + 手動貼上、用戶自助解決 | 仍可抽獎、訊息提示 |
| Vercel Serverless Function | /api/draw 5xx 掛掉 | 切換到純 client 端執行（在 App.jsx run RNG）、效果相同 | 不中斷 |
| LINE 推播服務 | LINE Notify 5xx 掛掉 | 切換到 webhook（Slack / Discord）+ 顯示「推播失敗重試」| 不影響抽獎，僅推播延遲 |
| Stripe webhook 失敗 | Stripe 5xx 掛掉 | 本地排程每 5 分鐘 reconcile + Stripe 內建 retry 3 次 | 訂閱狀態延遲 ≤15min 同步 |
| Facebook OAuth 變動 | Graph API 版本 deprecated 掛掉 | 鎖版本（v19.0）+ 監控 + 切換書籤插件 | 用戶仍可運作 |
| CSV 上傳格式錯 | encoding 不是 UTF-8 | 自動偵測 Big5 / GBK 並轉換 | 不中斷、提供預覽 |
| Chrome 擴充 Manifest v3 | 舊 manifest v2 不被接受掛掉 | 自動升級 v3 + 顯示「更新擴充」| 用戶仍可用書籤插件 |
| Web Clipboard API 失效 | navigator.clipboard.writeText 拒絕掛掉 | fallback 隱藏 textarea + execCommand | 仍可複製 |

### 5.4 擴展性

- v1 純前端 100K 月訪無壓力
- v2 Supabase + Stripe 商用版
- v3 AI 自動分類 + 多平台整合

---

## 6. 完成標準 (Definition of Done)

### 6.1 v1 MVP DoD

- [x] Vercel production URL
- [x] GitHub Repo 公開
- [x] Vite 5 + React 18 + Tailwind 3 已建
- [x] index.html SPA 正常運行
- [x] App.jsx 46KB 含完整抽獎 UI
- [x] 4 種去重模式（name / comment / name-comment / none）
- [x] 條件篩選（必含 / 排除 / 黑名單）
- [x] 多獎項支援（parsePrizes 函式）
- [x] Mulberry32 PRNG + hashString
- [x] 抽獎動畫
- [x] CSV / JSON / 複製匯出
- [x] 37 個單元測試全綠
- [x] FB OAuth + Graph API（auth + callback + comments + parse-post）
- [x] 書籤插件 bookmarklet
- [x] Chrome 擴充 v1.1 自動捲動
- [x] UI Linear/Vercel 等級（Notion 認證）
- [x] 工具頁自動偵測剪貼簿匯入
- [x] Vercel +1 分支（dev / fb-giveaway-v2 live）
- [ ] IG 留言抽獎支援（v2）
- [ ] LINE 推播中獎通知（v2）
- [ ] 加權抽獎（v2）
- [ ] 商用版多帳號 dashboard（v2）
- [ ] 企業版白標（v2）
- [ ] 中英簡繁切換（v2）
- [ ] 抽獎活動報名管理（v2）

### 6.2 v2 上線 DoD

- [ ] IG 留言 OAuth + 抽獎
- [ ] LINE Notify 整合
- [ ] 商用版 onboarding + Stripe
- [ ] 加權抽獎（VIP 機率高）
- [ ] 活動報名 URL（公開抽獎頁）
- [ ] Notion / Slack webhook 整合
- [ ] 中英簡繁切換
- [ ] A/B 測試付費文案

---

## 7. 風險與決策

### 7.1 風險表

| ID | 風險 | 等級 | 緩解 | Owner |
|---|---|---|---|---|
| R-001 | FB 政策禁止自動化抓留言 | 🟠 中 | 純用戶端操作、書籤插件使用者自責、Chrome 擴充不開 Bot | Sophia |
| R-002 | 抽獎公正性爭議（客訴）| 🟠 中 | 明確聲明「隨機工具、結果不可重現」、種子 RNG 可重現證明 | Sophia |
| R-003 | 個資疑慮（中獎名單匯出）| 🟡 低 | 全 localStorage 處理 + 顯示「請勿上傳個資」 | Sophia |
| R-004 | FB 政策禁止第三方抽獎 App | 🟠 中 | 純工具、不舉辦活動、不涉抽獎規則 | Sophia |
| R-005 | Twitter / IG 業配做抽獎被罰 | 🟡 低 | 免責聲明、明確標示非平台認證 | Sophia |
| R-006 | Facebook OAuth 政策變動 | 🟠 中 | 鎖 v19.0 + 監控 + 書籤插件 fallback | Alan |
| R-007 | 商用版客戶濫用（洗抽獎）| 🟠 中 | Cookie 指紋 + QPS 限制 | Alan |
| R-008 | LINE Notify 服務掛掉 | 🟡 低 | 切到 Slack / Discord webhook | Alan |

### 7.2 ⭐ ADR (Architecture Decision Records)

#### ADR-001: 不開 FB Bot、只開書籤插件 + Chrome 擴充
**決策**：FB 整合走書籤插件 + Chrome 擴充（client 端 DOM 抓取），**不開 FB Graph Bot**。

**理由**：
- FB 政策禁止第三方自動化抓 FB 資料、Bot 帳號會被永久封鎖
- 書籤插件是使用者在自己瀏覽器執行、責任歸使用者、平台不封
- Chrome 擴充 v3 可以偵測 FB DOM、但也是 client-side、合規

**取捨**：
- ✅ 優：合規、不被 FB 封
- ❌ 劣：要使用者手動啟動書籤插件（不是 1 鍵按鈕）

**何時改**：FB Graph API 開放 `comments_read` 第三方 App 權限 → 改用官方 API

#### ADR-002: Mulberry32 PRNG 種子可重現
**決策**：使用 Mulberry32 PRNG（種子 RNG），每位 user 可選 seed。

**理由**：
- 結果可重現（同一留言 + 同一 seed = 同一結果）
- 行銷公司代辦可證明「隨機公平」
- 法律見證 / 公證機關可用此 seed 重現結果
- JS `Math.random()` 不可重現、太黑盒

**取捨**：
- ✅ 優：公平性 + 法律可用
- ❌ 劣：使用者必須保留 seed 才能查歷史（簡單 enter 鍵）

#### ADR-003: 純前端 + Vercel Serverless（v1）
**決策**：v1 純前端（無 DB）+ Vercel Serverless Functions for FB API。

**理由**：
- 留言資訊敏感、不存 DB = 合規
- Vercel Serverless 免費 tier 100K / 月足夠
- 0 月成本、人人都能用

**取捨**：
- ✅ 優：完全免費、完全匿名、合規
- ❌ 劣：無活動紀錄（v2 才加）

#### ADR-004: 4 種去重模式可選
**決策**：給用戶 4 種去重模式（name / comment / name-comment / none），**不預設強制去重**。

**理由**：
- 抽獎規則多變、有活動要「重複留言有更多機會」也有「只算一次」
- 4 種覆蓋 99% 場景、簡單 UI
- 不強加設定（給 default 但可改）

**取捨**：
- ✅ 優：彈性高
- ❌ 劣：用戶可能選錯導致不公平抽獎

#### ADR-005: 廣告 / 推薦傭金只放抽獎相關電商
**決策**：廣告位只放「抽獎相關」商家（抽獎箱、禮品、商家活動服務）。

**理由**：
- 立場中立、不推雜亂
- 自然關聯（用戶辦抽獎會需要買小禮物）
- 抽獎類電商毛利率高（CPC 高）

**取捨**：
- ✅ 優：受眾精準 + 不雜亂
- ❌ 劣：廣告庫存量小

#### ADR-006: 商用版 NT$1,499/月（不開月繳折扣太高）
**決策**：商用版定 NT$1,499/月、年繳 25% off。

**理由**：
- 台灣小編 / 行銷公司可負擔 + 客單利潤高
- 商用版 SaaS 黃金定價 NT$1,499（業界中位數）
- 不打折到 NT$999，避免變 free tier 競爭

---

## 8. 里程碑與 Sprint 拆解

### 8.1 里程碑總覽

| 里程碑 | 期間 | 目標 | DoD |
|---|---|---|---|
| **M1: v1 完成** | 2026-07-11 ✅ | 純前端 + 37 test + Chrome 擴充 | §6.1 v1 DoD 部分已 ✅ |
| **M2: v2 加值** | 2026-08-01 → 09-30 | IG + LINE + 加權抽獎 | §6.2 v2 DoD |
| **M3: 商用版上線** | 2026-10-01 → 11-30 | 多帳號 + Stripe | NT$200K MRR |
| **M4: 白標 + 自動化** | 2026-12-01 → 2027-02-28 | 企業版 + Notion 整合 | NT$500K MRR |

### 8.2 Sprint 拆解 (從 PRD 到「每天做什麼」)

#### Sprint 1（4 週，IG + LINE + 加權）
- Day 1-3: IG Graph API OAuth（Facebook Login for Business）
- Day 4-5: IG 留言解析 + 去重模式
- Day 6-8: LINE Notify 整合（推播中獎）
- Day 9-10: 加權抽獎演算法（VIP 機率高）
- Day 11-14: A/B 測試付費文案

#### Sprint 2（4 週，商用版 + 活動）
- Day 1-3: Supabase Auth + 組織 / 會員 CRUD
- Day 4-5: 商用版 dashboard（多活動列表）
- Day 6-7: 抽獎活動報名 URL（公開活頁）
- Day 8-10: Stripe 訂閱（含升降級）
- Day 11-12: 不需登入的「訪客」抽獎入口
- Day 13-14: 多帳號權限分離

#### Sprint 3（4 週，白標 + 多平台 + i18n）
- Day 1-3: 白標 subdomain 客製（react-router + 自定 theme）
- Day 4-5: 主色 / logo 上傳
- Day 6-7: 企業版 API（REST + Webhook）
- Day 8-10: 中英簡繁切換（i18n）
- Day 11-12: Notion / Slack webhook 整合
- Day 13-14: 跨平台（X / TikTok / 小紅書）

#### Sprint 4（4 週，AI + 規模）
- Day 1-3: AI 自動分類留言（業配 / 真實）
- Day 4-5: 垃圾帳號偵測 + 排除
- Day 6-7: 抽獎 NFT 化（POC）
- Day 8-10: 大量測試 + 性能調校
- Day 11-14: 正式 launch M4 + 行銷活動

---

## 9. 變現路徑 + 定價心理學

### 9.1 變現方案

| Tier | 價格 | 對象 | 包含功能 |
|---|---|---|---|
| 🆓 Free | NT$0 | 一般 FB 小編 | 全部 1 抽獎功能 + Chrome 擴充 + 37 個測試保證 |
| 🌟 進階版 | NT$299/月 | IG + LINE 整合者 | 加 IG 支援 + LINE 推播 + 加權抽獎 |
| 💼 商用版 | NT$1,499/月 | 行銷公司 | 進階版 + 多活動 + 多帳號 dashboard + API |
| 🏢 企業版 | NT$4,999/月 | 大品牌 / 政府抽獎 | 商用版 + 白標 + 客服優先 + SLA 保證 |
| 📰 廣告 | NT$5K-30K/月 | 抽獎相關電商 | 首頁 banner + sidebar + in-tool 推薦 |

### 9.2 定價心理學

| 心理技巧 | 應用 | 效果預期 |
|---|---|---|
| **Charm pricing** | NT$299 / NT$1,499 / NT$4,999 | 視覺低 1 位數 |
| **Year discount** | 年繳 25% off | 「省 NT$4,500」錨點 |
| **Anchoring** | 排序：Free → 進階 → 商用 → 企業 | 中間層「進階 NT$299」顯得划算 |
| **Decoy effect** | Free vs 進階 NT$299 vs 商用 NT$1,499（差 5 倍）| 商用顯得貴但合理 |
| **$1/day 錯覺** | 商用 NT$1,499/月 ≈ NT$50/天 | 「比外送茶資便宜」|
| **Risk reversal** | 「14 天試用、不滿意退款」 | 商用版轉換率 +30% |
| **Authority / Trust** | 「37 個單元測試全綠」「UI 達 Linear/Vercel 等級」 | 「這不是普通開發者做的」|

---

## 10. 附錄

### 10.1 競品分析 (Competitive Quadrant Chart)

```mermaid
quadrantChart
    title FB 留言抽獎工具 — 競品定位
    x-axis 低繁中在地 --> 高繁中在地
    y-axis 低免費 --> 高免費（無月費）
    quadrant-1 高繁中 + 高免費（理想區）
    quadrant-2 高免費 + 低繁中（英文海外工具）
    quadrant-3 低繁中 + 低免費（陸製月費工具）
    quadrant-4 高繁中 + 低免費（陸製免費陽春）
    "Gleam.io": [0.20, 0.30]
    "Woobox": [0.20, 0.30]
    "ShortStack": [0.20, 0.40]
    "Mr. Beam (台)": [0.85, 0.65]
    "一款抽獎小工具 (簡中)": [0.50, 0.70]
    "我們 (Comment Flow)": [0.95, 0.95]
```

### 10.2 術語表

| 術語 | 定義 |
|---|---|
| Mulberry32 | 32-bit PRNG，可用 seed 重現結果 |
| seed | 隨機種子，固定 seed = 固定結果（可重現）|
| Bookmarklet | 瀏覽器書籤列的小工具（JavaScript inline）|
| Chrome 擴充 | manifest v3 WebExtension |
| 去重 (dedupe) | 同一用戶多留言只算一次 |
| FB Graph API | Facebook 官方 API（讀留言 / 發文）|
| FB Bot | FB 平台上自動執行 App（FB 政策禁止）|
| 書籤插件 | 純 client DOM 抓取代 FB API 的方案 |
| Linear/Vercel 等級 | UI 在細節、字體、互動感達業界頂級 SaaS 標準 |

### 10.3 參考資料

- Mulberry32 PRNG: https://en.wikipedia.org/wiki/Mulberry32
- Facebook Graph API: https://developers.facebook.com/docs/graph-api/
- LINE Notify: https://notify-bot.line.me/
- Chrome Extension Manifest v3: https://developer.chrome.com/docs/extensions/mv3/
- Vitest: https://vitest.dev/

### 10.4 ⭐ Error Code 統一字典

| HTTP | Code | 含義 | 觸發場景 | 客戶端處理 |
|---|---|---|---|---|
| 400 | BAD_REQUEST | 輸入欄位錯誤 | CSV 格式錯 | 顯示錯誤、給預覽 |
| 401 | UNAUTHENTICATED | 沒登入 | 商用功能無登入 | CTA 登入 |
| 402 | PAYMENT_REQUIRED | 訂閱過期 | IG 用商用 | CTA 升級 |
| 403 | FORBIDDEN_TIER | 訂閱層級不足 | 白標只用企業 | CTA 升級 |
| 404 | POST_NOT_FOUND | FB 貼文 URL 不存在 | 刪文 / 假 URL | 顯示「重新貼上」|
| 409 | DUPLICATE_GIVEAWAY | 同活動重複建立 | 重複按送 | 顯示「已存在」|
| 422 | INVALID_SEED | seed 格式錯 | seed 含特殊字元 | 重設 |
| 429 | RATE_LIMITED | API 超限 | LINE Notify QPS | retry-after 60s |
| 500 | DRAW_RUNTIME_FAIL | 抽獎 serverless 掛掉 | 隨機失敗 | 重試 3 次 |
| 502 | FB_GRAPH_API_DOWN | FB API 5xx | FB 維修 | 切書籤插件 banner |
| 503 | OAUTH_REVOKED | 用戶撤銷 OAuth token | 用戶改密碼 | CTA 重新登入 |

---

## 11. 市場驗證計畫

### 11.1 驗證前 3 個關鍵問題

1. **小編真實痛點夠強嗎？** 是 — 1 個月辦 1-3 次、辦得很累
2. **免費意願會推動 IG 進階版付費嗎？** 預期 30% 願意付
3. **商用版 NT$1,499 對行銷公司可負擔嗎？** 是 — 他們月接 5-10 案

### 11.2 訪談 SOP

**招募**：FB 粉專小編交流會、Facebook Marketing 群、Threads 上小編主理人

**腳本**：
1. 「你怎麼辦留言抽獎？」→ 開放敘述
2. demo URL、5 分鐘操作
3. 「NT$1,499/月 商用版好用嗎？」
4. 收 email

### 11.3 落地指標

| 指標 | 6 個月目標 | 量測工具 |
|---|---|---|
| 月訪 (UV) | 50,000 | Vercel |
| Chrome 擴充安裝 | 5,000 | Web Store |
| 進階版付費 | 30 個 | Stripe |
| 商用版付費 | 10 個 | Stripe |
| 企業版 | 2 個 | 業務契約 |
| 月抽獎次數 | 100,000 | localStorage event（匿名）|

---

## 12. 失敗模式 SOP

| 失敗 | 觸發條件 | 立即處置 | Post-mortem |
|---|---|---|---|
| **FB Graph API 變動** | 月監控 + Graph changelog 通知 | 鎖版本 + fallback 書籤插件 | 加測試 |
| **Chrome 擴充 manifest v2 拒絕** | 8 月檢查 | 升級 v3 + 重新送審 | 持續監控 |
| **抽獎糾紛（客訴）** | 月監控 | 給種子重現證明 + 客服 | 加圖文記錄 |
| **LINE Notify 拒絕商業使用** | 6 月檢查 | 切換 Slack / Discord | 量化用 |
| **Gleam 等大平台擠免費層** | 競爭對手 release | 強化本地化 + 免費加功能 | 持續更新 |
| **BOOKMARKLET FB DOM 變動** | FB UI 更新 | 改 Chrome 擴充 + 重新偵測 DOM | 自建 unit test |
| **種子 RNG 結果被質疑** | 客訴 | 公開 hashString + seed 計算過程 | 加視覺化驗證 |

---

## 13. MetaGPT / spec-kit 對齊

### 13.0 Must/Should/May 需求語言（RFC 2119 / MetaGPT）

系統 MUST（缺則 fail launch）：

- MUST 純前端運作（FB 留言不存 DB）
- MUST 3 種導入方式（貼上 / CSV / 書籤插件）
- MUST 4 種去重模式可選
- MUST 種子 RNG 可重現
- MUST 37 個單元測試全綠
- MUST Vercel production 200 OK
- MUST Chrome 擴充 + 書籤插件
- MUST 抽獎結果可匯出（CSV / JSON）
- MUST FB 政策合規（不開 Bot）
- MUST 免責聲明

系統 SHOULD（強烈建議）：

- SHOULD IG 留言抽獎支援
- SHOULD LINE Notify 推播
- SHOULD 加權抽獎
- SHOULD 多語系（中英簡繁）
- SHOULD Notion / Slack webhook 整合
- SHOULD 抽獎活動 URL（公開活頁）

系統 MAY（探索性）：

- MAY AI 自動分類留言
- MAY 跨平台（X / TikTok / 小紅書）
- MAY 抽獎 NFT 化（區塊鏈）
- MAY 多帳號協作 dashboard

### 13.1 Requirement Pool

| Priority | ID | 需求 | 來源 | 估時 | 獨立測試 |
|---|---|---|---|---|---|
| **P0** | F-101 | IG 抽獎 | SPEC §1.4 | 1 sprint | 30 IG 樣本 |
| **P0** | F-102 | LINE 推播 | SPEC §1.4 | 1 sprint | 5 用戶訂閱 |
| **P0** | F-103 | 加權抽獎 | SPEC §1.4 | 0.5 sprint | 5 種加權對照 |
| **P0** | F-104 | 活動報名 URL | SPEC §1.4 | 1 sprint | 10 訪客抽完 |
| **P1** | F-105 | 多帳號 dashboard | SPEC §1.4 | 1 sprint | 3 帳號協作 |
| **P1** | F-106 | 白標 | SPEC §1.4 | 1 sprint | 3 客戶客製 |
| **P1** | F-107 | 企業版 API | SPEC §1.4 | 1 sprint | REST 文件 |
| **P2** | F-108 | 多語系 | SPEC §1.4 | 0.5 sprint | 中英切換 |
| **P2** | F-109 | Notion 整合 | SPEC §1.4 | 0.5 sprint | 10 webhook |
| **P2** | F-110 | 垃圾帳號偵測 | SPEC §1.4 | 1 sprint | AI 評分 |

### 13.2 Quadrant Chart（執行優先級）

```
高
緊迫 ●  ● 
  ↑
  │  F-101 (1 sprint)         F-105 (1 sprint)
  │
  │  F-102 (1 sprint)         F-106 (1 sprint)
  │  F-103 (0.5 sprint)
  │
  │                          F-108 (0.5 sprint)
  │
  │  F-110 (1 sprint)
  ↓
低
   低                        高
         重要性 →
```

### 13.3 Open Questions

1. IG OAuth 與 FB OAuth 流程差異？
2. LINE Notify 是否仍然接受使用者？（2026 已收緊）
3. Chrome Web Store 是否允許 FB 整合擴充？
4. 抽獎活動 URL 是否獨立子網域？
5. AI 自動分類是否會引起 FB 反感？

---

## 14. AI Agent 實測驗證法

### 14.1 自我驗證 Checklist

```
[ ] git pull origin master
[ ] npm install
[ ] npm run dev
[ ] npm run build
[ ] npm run test（37 個全綠）
[ ] curl http://localhost:3000 → 200
[ ] 訪問 / 並貼上 30 留言 → 抽 → 看結果
[ ] 換 seed 再抽 → 同樣結果
[ ] CSV 匯入 → 預覽 → 抽
[ ] Facebook OAuth 測試（如已有 token）
[ ] 書籤插件模擬
[ ] Chrome 擴充（手動裝）
```

### 14.2 自動化驗證

```bash
python3 ~/.hermes/skills/write-prd-v2/scripts/validate_prd.py SPEC.md
# 目標 ≥ 90%
```

---

## 15. 深度市調報告

### 15.1 市場規模（全球 + 繁中 + 目標市場）

| 市場 | 規模 | 來源 | 預估付費意願 |
|---|---|---|---|
| **全球 FB 粉專** | ~300M | Meta 2025 | 工具訂閱 1% = 3M |
| **台灣 FB 粉專** | ~50K | iResearch 2025 | 工具訂閱 30% = 15K |
| **華文 FB 小編** | ~500K | 中港台 2025 | 工具訂閱 10% = 50K |
| **IG 小編** | ~100K | IG 公開 2025 | 工具訂閱 5% = 5K |
| **行銷 / 公關公司** | ~5K | 台灣市調 2025 | SaaS 訂閱 50% = 2.5K |

**TAM**：NT$300M（全球 + 繁中抽獎工具）
**SAM**：NT$30M（華文 + IG + 行銷）
**SOM**：3 年內取得 5% SAM = **NT$1.5M ARR**

### 15.2 競品分析（已在 §10.1 詳述）

5 家主要 + Competitive Quadrant Chart（Mermaid）

### 15.3 預期收益（保守 / 中等 / 樂觀）

| 區間 | 12 個月 MRR | 12 個月 ARR | 達標情境 |
|---|---|---|---|
| 🔴 保守 | NT$30K | NT$360K | 100 進階 + 5 商用 + 1 企業 |
| 🟡 中等 | NT$300K | NT$3.6M | 1000 進階 + 30 商用 + 5 企業 |
| 🟢 樂觀 | NT$1M | NT$12M | 3000 進階 + 100 商用 + 20 企業 + 白標 30 |

**總結**：**中等區間 NT$3.6M ARR 可達標**（假設 30% IG 小編付費 NT$299 + 30% 行銷付費 NT$1,499）

### 15.4 商業化評分（0-100）

從 Sean 三維評分法評估：

| 維度 | 分數 | 說明 |
|---|---|---|
| **後端** | 70 | ✅ React 18 + Vite 5 + 9 個 API routes（draw/auth/callback/comments/parse-post/csv/facebook/* + 4）|
| **Auth** | 50 | ✅ FB OAuth 已實作、Stripe 無；缺 Supabase Auth |
| **真實金流** | 5 | ❌ Stripe 0%；進階版付費純 spec |
| **法律頁 / 客服頁** | 30 | ⚠️ README 有、無 ToS/Privacy |
| **UI / 設計** | 95 | ✅ Linear/Vercel 等級（Notion 認證）|
| **SEO / 內容** | 45 | ⚠️ SPA SEO 弱；Notion 沒寫 blog |
| **部署 / DevOps** | 85 | ✅ Vercel + 4 feature branches + 1 main |
| **市場差異化** | 90 | ✅ 業界首個繁中「完全免費 + 3 種導入 + 種子可重現 + 37 個單元測試」抽獎工具 |
| **驗證 / Analytics** | 60 | ✅ 37 個單元測試；缺 E2E、analytics |

**原始總分**：(70+50+5+30+95+45+85+90+60) / 9 = 58.9 / 100

**加上**：
- +5 Chrome 擴充 v1.1（業界領先）
- +3 App.jsx 46KB 已含完整 UI（不是 partial spec）
- +2 書籤插件可運作

### 15.5 ⭐ 商業化評分最終：68 / 100

**升級到 9/10 = 90 分路徑**：

1. +10 實作 Sprint 1 IG + LINE + 加權抽獎
2. +8 實作 Sprint 2 商用版 + Stripe + 多帳號 dashboard
3. +2 加法律頁（ToS / Privacy）
4. +1 加 Vercel Analytics
5. +1 加 Notion 整合

預計時程：**3-4 個月**（4 sprints）

---

*本規格書版本：v2.2.1 — 2026-07-11*
*升級從 v1.0 (3.6K 字) → v2.2.1 (~40K bytes)*
*合規度：目標 ≥90%（跑 validate_prd.py 驗證）*
*下一版：v2.2.2 — 預計 Sprint 1 IG + LINE 加值*
