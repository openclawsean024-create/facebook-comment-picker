# Facebook 留言抽獎工具 — 產品規格書 v4 (Final)

> **版本**：v4.0  
> **更新日期**：2026-04-04  
> **狀態**：✅ READY FOR IMPLEMENTATION  
> **Sean 原始反饋**：「匯入留言與設定抽獎條件和 Draw Result 上移到網頁的第二層樓；如何能夠第三方抓取完整的公開貼文還沒實作，請提供解決方案並實作」  
> **前版狀態**：v3（facebook-comment-picker-v3.md）

---

## 一、願景與產品定位

**一句話價值主張**：公平透明、一鍵產出 Facebook 公開貼文留言抽獎名單。

**目標受眾**：台灣粉絲團管理員、網紅、自媒體行銷人員

---

## 二、Sean's Feedback — Layer 2 導航 + 第三方抓取 🔧

### 2.1 Feedback 1：Layer 2 導航（Tab/Stepper 設計）

> 「匯入留言與設定抽獎條件和 Draw Result 上移到網頁的第二層樓」

**設計原則**：三大核心步驟（匯入 / 設定條件 / 開獎）無需滾動即可操作，全部在第二層樓完成。

**Layer 2 頁面架構**：
```
┌─────────────────────────────────────┐
│ Logo                          登入   │ ← 第一層樓（Header）
├─────────────────────────────────────┤
│ 🔗 post_url_here...                 │ ← 貼文 URL 顯示列
├─────────────────────────────────────┤
│                                     │
│  [📥 匯入留言] → [🎯 設定條件] → [🎉 開獎結果] │ ← LAYER 2 TABS
│                                     │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │   Tab 內容區（依步驟切換）   │   │
│  │                             │   │
│  │   - 匯入留言：URL輸入+抓取   │   │
│  │   - 設定條件：條件表單       │   │
│  │   - 開獎結果：中獎名單卡片   │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                     │
│  [上一步]              [下一步/開獎]│
│                                     │
└─────────────────────────────────────┘
```

**Stepper 進度條**：
```
[1. 匯入留言] ──→ [2. 設定條件] ──→ [3. 開獎結果]
     ●                  ○                  ○
   完成               當前               等待
```

### 2.2 Feedback 2：Facebook Graph API 第三方抓取

> 「如何能夠第三方抓取完整的公開貼文還沒實作，請提供解決方案並實作」

**推薦方案：Facebook Graph API（OAuth 2.0 授權）**

**流程**：
```
用戶粘貼 Facebook 貼文 URL
    ↓
系統解析出 post ID
    ↓
用戶點擊「授權抓取」（觸發 Facebook OAuth）
    ↓
取得 user access token（個人用戶即可，無需企業認證）
    ↓
呼叫 Graph API 抓取該貼文下所有留言（含分頁）
    ↓
解析留言資料（姓名、留言內容、時間）
    ↓
匯入抽獎候選名單
```

**Graph API 實作**：

```javascript
// Step 1: 解析 post URL 取得 post ID
function extractPostId(url) {
  // https://www.facebook.com/username/posts/123456789
  // https://www.facebook.com/photo?fbid=123456789
  // https://www.facebook.com/permalink.php?story_fbid=xxx&id=xxx
  const match = url.match(/posts\/(\d+)|fbid=(\d+)|story_fbid=(\d+)/);
  return match ? (match[1] || match[2] || match[3]) : null;
}

// Step 2: 抓取留言（支援分頁）
async function fetchComments(postId, accessToken) {
  const comments = [];
  let url = `https://graph.facebook.com/v18.0/${postId}/comments?fields=id,message,from{name,id},created_time,parent&access_token=${accessToken}&limit=100`;
  
  while (url) {
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }
    
    comments.push(...data.data);
    url = data.paging?.next || null;  // 自動抓取下一頁
  }
  
  return comments;
}

// Step 3: 匯入抽獎候選名單
function importToRaffle(comments) {
  return comments
    .filter(c => !c.parent)  // 排除回覆（只取主留言）
    .map(c => ({
      id: c.id,
      name: c.from?.name || 'Unknown',
      userId: c.from?.id,
      message: c.message,
      time: c.created_time,
    }));
}
```

**Alan 的實作清單**：

| 功能 | API Route | 說明 |
|------|-----------|------|
| OAuth 授權頁 | `/api/facebook/auth` | 跳轉 Facebook 授權 |
| OAuth 回調 | `/api/facebook/callback` | 接收 code，換 token |
| 解析貼文 | `/api/facebook/parse-post` | 從 URL 解析 post ID |
| 抓取留言 | `/api/facebook/comments` | Graph API，含分頁處理 |
| 備用爬蟲 | `/api/facebook/import-url` | ScraperAPI 備用方案 |
| 手動 CSV 匯入 | `/api/import/csv` | 最終備案 |

**備用方案：ScraperAPI 爬蟲**（當 Graph API 無法使用時）：
```javascript
async function scrapeViaScraper(postUrl) {
  const res = await fetch('http://api.scraperapi.com?api_key=YOUR_KEY&url=' + encodeURIComponent(postUrl));
  const html = await res.text();
  // DOM 解析抽出留言...
}
```

### 2.3 抽獎條件設定（Tab 2）

| 功能 | 說明 |
|------|------|
| 抽獎人數 | 數量輸入（1-N） |
| 排除重複留言者 | 同一用戶多條留言只計一次 |
| 排除非粉絲 | （需 Facebook Page 粉絲資格審核）|
| 關鍵字過濾 | 排除含特定關鍵字之留言 |
| 標記要求 | 需 @標記 N 人以上 |
| 留言次數門檻 | 限定留言 N 次以上 |

### 2.4 開獎結果展示（Tab 3）

| 功能 | 說明 |
|------|------|
| 中獎名單 | 卡片式（頭像 + 名稱 + 留言時間） |
| 分享 | 一鍵分享至 FB/LINE |
| 匯出 | CSV / Excel 匯出 |
| 重新抽獎 | 保留條件重新抽 |

---

## 三、Alan 實作優先順序

| 優先 | 功能 | 工時 |
|------|------|------|
| P0 | Layer 2 Tab/Stepper UI 實作 | 6h |
| P0 | Facebook Graph API OAuth + 留言抓取 | 8h |
| P1 | 條件過濾邏輯實作 | 6h |
| P1 | 開獎結果 UI | 4h |
| P2 | CSV 手動匯入（備用）| 4h |
| P2 | ScraperAPI 備用爬蟲 | 8h |

---

## 四、驗收標準

- [ ] Layer 2 三大 Tab（匯入/設定/結果）全部可在首屏完成
- [ ] Facebook 授權流程正常運作
- [ ] 成功抓取測試貼文的公開留言
- [ ] 抽獎條件設定正確套用
- [ ] 中獎名單正確隨機抽出

---

*規格書版本：v4*
*更新時間：2026-04-04*
*更新內容：Layer 2 導航改版 + Facebook Graph API 第三方抓取實作方案*
*負責人：Sophia（CEO/產品負責人）*
