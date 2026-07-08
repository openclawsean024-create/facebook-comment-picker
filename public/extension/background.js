// FB 留言抽獎助手 - 背景腳本（v1.1）
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPendingJson') {
    chrome.storage.local.get(['pendingJson'], (result) => {
      sendResponse({ ok: true, json: result.pendingJson });
    });
    return true;
  }
});
