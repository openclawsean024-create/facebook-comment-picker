# LINE/FB/threads CLI Wrapper 工廠 — 規格計劃書 v1.0

> 版本：v1.0｜更新日期：2026-07-11｜維護者：Sophia (CPO)
> 對接技術：Alan (CTO)

---

## 1. 問題陳述

### 1.1 目標使用者

| 族群 | 規模 | 痛點 |
|---|---|---|
| 中小企業客服/小編 | ~15 萬 | 每天要回 FB/LINE/Threads 留言，手動切換 3 個 App 浪費時間 |
| KOL / 自媒體經營者 | ~5 萬 | 跨平台訊息管理困難、易漏回 |
| 行銷公司 | ~3,000 | 客戶帳號多平台管理、人力成本高 |
| 工程師 | ~10 萬 | 想自動化社群互動但各平台 API 規格不同 |

### 1.2 為什麼不做替代方案

- **商用社群管理工具（Hootsuite/Sprout Social）**：月費 100-500 USD，對台灣微型企業太貴
- **各平台 App 手動切換**：每天耗 1-2 小時、易漏回
- **自己寫 API 串接**：需工程師 + 各平台 API 規格不同 + OAuth 流程複雜
- **我們的解法**：把 LINE/FB/Threads API 包成統一 CLI，3 個平台用同一指令操作，訂閱制 $99-299 USD/月

---

## 2. 解決方案

### 2.1 核心價值主張

> 「一個 CLI 管 3 個社群平台 — 自動回覆、排程發文、私訊整合。」

### 2.2 使用者流程

1. 註冊帳號 + 連結 LINE/FB/Threads API key
2. 安裝 CLI：`npm install -g @sophia/social-cli`
3. 設定自動回覆規則（關鍵字 → 自動回覆）
4. 排程發文（每日/每週/每月）
5. Dashboard 查看跨平台訊息彙整

---

## 3. 功能清單

### 3.1 MVP（必做）

- [ ] CLI 安裝包（npm global package）
- [ ] LINE/FB/Threads 三平台 OAuth 串接
- [ ] 自動回覆規則引擎（關鍵字 + 模板）
- [ ] 排程發文（5 平台時間格式）
- [ ] 私訊統一收件匣
- [ ] 訊息歷史查詢
- [ ] Web Dashboard（規則設定 + 數據）

### 3.2 v2（加值）

- [ ] AI 自動回覆（GPT-4o mini）
- [ ] 多帳號管理（公司旗下多品牌）
- [ ] 報表匯出（客服 KPI）
- [ ] LINE / FB 廣告投放整合

### 3.3 明確不做

- 內容審核（Meta 政策嚴格，先不碰）
- 跨平台訊息合併（同用戶在 FB/LINE 帳號對應）
- 短影片自動發布（純文字 + 圖片）
- 真人客服後台整合

---

## 4. 技術棧

| 層 | 選擇 | 理由 |
|---|---|---|
| CLI | Node.js + Commander.js | 跨平台、輕量 |
| Dashboard | Next.js 14 + TypeScript | 與既有架構一致 |
| 資料庫 | PostgreSQL + Prisma | 用戶/規則/訊息 |
| API 串接 | LINE Messaging API + Facebook Graph API + Threads API | 官方 SDK |
| 排程 | BullMQ + Redis | 背景任務 |
| 部署 | Vercel + Railway |

---

## 5. 完成標準（Definition of Done）

- [ ] Vercel production URL（https://src-tau-ruddy-65.vercel.app 或新網址）200 OK
- [ ] GitHub Repo 公開（https://github.com/openclawsean024-create/facebook-comment-picker）
- [ ] CLI 可安裝 + 啟動
- [ ] 3 平台 OAuth 串接測試通過
- [ ] 自動回覆規則可運作（測 5 種情境）
- [ ] 排程發文可執行
- [ ] Dashboard 可登入 + 看見數據

---

## 6. 風險與決策

| 風險 | 等級 | 緩解 |
|---|---|---|
| 各平台 API 變動頻繁 | 🔴 高 | 抽象化 API 層 + 自動監控 + 版本化 SDK |
| Meta 政策變化（廣告/訊息限制） | 🟠 中 | 監控 + 明確聲明 + 不做內容審核 |
| OAuth token 外洩風險 | 🟠 中 | token 加密儲存 + 定期 rotate |
| 垃圾訊息濫用 | 🔴 高 | 用戶身份認證 + 使用量監控 + 違規停權 |

---

## 7. 變現路徑

| 方案 | 價格 | 功能 |
|---|---|---|
| 免費版 | NT$0 | 1 平台 + 50 訊息/月 |
| 個人版 | NT$299/月 | 3 平台 + 1000 訊息/月 + 自動回覆 |
| 工作室版 | NT$1,499/月 | 個人版 + 多帳號 + AI 自動回覆 + 報表 |
| 企業版 | NT$4,999/月 | 工作室版 + API + SSO + 客服優先 |

---

*本規格書版本：v1.0 — 2026-07-11*