document.getElementById('btn-full').addEventListener('click', async () => {
  setStatus('抓取中... 請稍候（最多 30 秒）', '');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    // 先注入 content script（如果尚未注入）
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    const result = await chrome.tabs.sendMessage(tab.id, { action: 'scrape' });
    showResult(result);
  } catch (e) {
    setStatus('❌ ' + e.message, 'error');
  }
});

document.getElementById('btn-quick').addEventListener('click', async () => {
  setStatus('快速抓取中...', '');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    const result = await chrome.tabs.sendMessage(tab.id, { action: 'quickScrape' });
    showResult(result);
  } catch (e) {
    setStatus('❌ ' + e.message, 'error');
  }
});

function showResult(result) {
  if (result?.ok) {
    setStatus(\`✅ 已抓到 <span class="count">${result.count}</span> 筆留言到剪貼簿\`, 'success');
  } else {
    setStatus('❌ 抓取失敗', 'error');
  }
}

function setStatus(text, cls) {
  const el = document.getElementById('status');
  el.innerHTML = text;
  el.className = 'status ' + (cls || '');
}
