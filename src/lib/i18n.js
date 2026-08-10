/**
 * 簡單 i18n — 繁中為主, 留英文 fallback 空間
 */
export const messages = {
  'zh-Hant': {
    'app.title': 'Comment Flow — 留言抽獎工具',
    'import.fromFanpage': '從粉專選擇貼文',
    'import.fbLogin': 'Facebook 登入並選擇貼文',
    'import.pasteUrl': '貼上 Facebook 公開貼文網址',
    'import.parseUrl': '🔗 自動抓取留言',
    'import.loadSample': '📋 載入示範資料',
    'import.csv': '匯入 CSV 檔案',
    'import.dragging': '請先登入 Facebook 才能選擇粉專貼文',
    'import.choosePost': '抽選擇粉專 → 選擇貼文 → 抓取留言',
    'conditions.title': '設定條件',
    'results.title': '開獎結果',
    'results.winners': '中獎名單',
    'results.candidate': '候選名單',
    'results.copy': '📋 複製結果',
    'results.export.csv': '匯出 CSV',
    'results.export.json': '匯出 JSON',
    'oauth.redirecting': '⏳ 跳轉到 Facebook 登入...',
    'oauth.success': '✅ Facebook 登入成功 — 現在可以選擇要抓取留言的粉專貼文。',
    'oauth.failed': '❌ Facebook 登入失敗',
    'modal.fanpages': '粉絲專頁',
    'modal.posts': '貼文',
    'modal.comments': '留言預覽',
    'modal.cancel': '取消',
    'modal.confirm': '✓ 匯入 {n} 筆留言',
    'error.network': '❌ 網路錯誤',
    'error.parsePostId': '無法解析貼文 ID',
    'error.tokenExpired': 'Token 已過期, 請重新登入',
  },
  'en': {
    'app.title': 'Comment Flow — FB Comment Giveaway Tool',
    'import.fromFanpage': 'Select Post from Fanpage',
    'import.fbLogin': 'Login Facebook & Select Post',
    // ... English translations here when needed
  },
};

export function t(key, locale = 'zh-Hant', vars = {}) {
  const m = messages[locale] || messages['zh-Hant'];
  let s = m[key] || messages['zh-Hant'][key] || key;
  for (const [k, v] of Object.entries(vars)) {
    s = s.replace(`{${k}}`, v);
  }
  return s;
}
