// FB 留言抽獎助手 v1.4 — 強化版抓取
(function() {
  'use strict';

  const isFbPost = () => {
    const url = window.location.href;
    return /facebook\.com\/.+/(posts|videos|reel|permalink|photo)\/|facebook\.com\/(story|share)\.php/.test(url);
  };
  if (!isFbPost()) return;

  if (!window.__fbPickerSeen) window.__fbPickerSeen = Object.create(null);
  if (!window.__fbPickerData) window.__fbPickerData = [];
  const seen = window.__fbPickerSeen;
  const allComments = window.__fbPickerData;

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const isUIElement = (t) => {
    if (!t) return true;
    t = t.trim();
    if (t.length < 1) return true;
    if (/^(Like|Reply|Share|讚|回覆|分享|查看更多|View more|See more|編輯|刪除|檢舉)$/i.test(t)) return true;
    if (/^\d+\s*(秒|分鐘|小時|天|週|月|年|seconds?|minutes?|hours?|days?|weeks?|months?)\s*(ago)?$/i.test(t)) return true;
    if (/^\d+[hHdDmMwW]$/.test(t)) return true;
    return false;
  };

  const extractFromBlock = (block) => {
    try {
      const authorLinks = block.querySelectorAll('a[href*="/user/"], a[href*="profile.php?id="]');
      if (!authorLinks.length) return null;
      let authorLink = null;
      for (const al of authorLinks) {
        const txt = al.textContent.trim();
        if (txt && txt.length >= 1 && txt.length <= 50) { authorLink = al; break; }
      }
      if (!authorLink) return null;
      const name = authorLink.textContent.trim();
      const href = authorLink.href;
      if (!name) return null;

      const container = authorLink.closest('div');
      if (!container) return null;
      const textEls = container.querySelectorAll('[dir="auto"]');
      let msg = '';
      for (const el of textEls) {
        const t = el.textContent.trim();
        if (!t || t === name) continue;
        if (isUIElement(t)) continue;
        if (t.length < 1 || t.length > 500) continue;
        msg = t;
        break;
      }
      if (!msg) return null;

      let uid = 'unknown';
      const idMatch = href.match(/[?&]id=(\d+)/) || href.match(/\/user\/([^/?]+)/);
      if (idMatch) uid = idMatch[1];

      return {
        id: 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        message: msg,
        created_time: new Date().toISOString(),
        from: { id: uid, name },
        like_count: 0,
      };
    } catch (e) { return null; }
  };

  const scan = () => {
    const sels = '[aria-label^="Comment by"], [aria-label^="留言 by"], [aria-label*="留言 by "], [aria-label*="Comment by "]';
    const containers = document.querySelectorAll(sels);
    containers.forEach((block) => {
      const c = extractFromBlock(block);
      if (!c) return;
      const key = c.from.id + '|' + c.message;
      if (seen[key]) return;
      seen[key] = 1;
      allComments.push(c);
    });
  };

  const clickMore = () => {
    const sels = ['查看更多留言', 'View more comments', 'See more comments', '顯示更多留言', '檢視更多留言', '查看更多回應', 'View more replies', 'See previous comments'];
    document.querySelectorAll('div,span,a,button,[role="button"]').forEach((el) => {
      const t = el.textContent && el.textContent.trim();
      if (t && sels.indexOf(t) >= 0) {
        try { el.click(); } catch (e) {}
      }
    });
  };

  const showPanel = (count) => {
    const old = document.getElementById('fb-picker-panel');
    if (old) old.remove();
    const panel = document.createElement('div');
    panel.id = 'fb-picker-panel';
    panel.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:999999;background:linear-gradient(135deg,#ff6666,#ff8b8b);color:white;padding:20px 24px;border-radius:24px;box-shadow:0 18px 50px rgba(255,102,102,0.4);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans TC",sans-serif;max-width:360px;';
    panel.innerHTML = '<div style="font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.2em;opacity:0.85;">FB 留言抽獎助手 v1.4</div>' +
      '<div style="font-size:22px;font-weight:900;margin:6px 0 4px;">已抓 ' + count + ' 則留言</div>' +
      '<div style="display:flex;gap:8px;margin-top:12px;">' +
      '<button id="fb-picker-copy" style="flex:1;padding:12px;background:white;color:#ff6666;border:none;border-radius:999px;font-weight:900;cursor:pointer;font-size:13px;">複製留言 JSON</button>' +
      '<button id="fb-picker-close" style="padding:12px 16px;background:rgba(255,255,255,0.2);color:white;border:none;border-radius:999px;font-weight:900;cursor:pointer;font-size:13px;">關閉</button>' +
      '</div>';
    document.body.appendChild(panel);

    document.getElementById('fb-picker-copy').addEventListener('click', () => {
      const json = JSON.stringify({ data: allComments }, null, 2);
      navigator.clipboard.writeText(json).then(() => {
        const btn = document.getElementById('fb-picker-copy');
        btn.textContent = '已複製！回工具頁貼上';
        btn.style.background = '#51CF66';
        btn.style.color = 'white';
        setTimeout(() => {
          btn.textContent = '複製留言 JSON';
          btn.style.background = 'white';
          btn.style.color = '#ff6666';
        }, 3000);
      });
    });

    document.getElementById('fb-picker-close').addEventListener('click', () => panel.remove());
  };

  const runCollect = async () => {
    allComments.length = 0;
    Object.keys(seen).forEach(k => delete seen[k]);

    let observer = null;
    if (window.MutationObserver) {
      observer = new MutationObserver(() => scan());
      observer.observe(document.body, { childList: true, subtree: true });
    }

    const startTime = Date.now();
    const MAX_RUNTIME = 30000;
    let noChangeCount = 0;
    let lastH = 0;

    while ((Date.now() - startTime) < MAX_RUNTIME) {
      clickMore();
      scan();
      window.scrollTo(0, document.body.scrollHeight);
      await sleep(1200);
      const h = document.body.scrollHeight;
      if (h === lastH) {
        noChangeCount++;
        if (noChangeCount >= 3) break;
      } else {
        noChangeCount = 0;
        lastH = h;
      }
    }
    window.scrollTo(0, 0);
    await sleep(500);
    clickMore(); scan(); clickMore(); scan();
    if (observer) observer.disconnect();

    const json = JSON.stringify({ data: allComments }, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      showPanel(allComments.length);
    }).catch(() => {
      showPanel(allComments.length);
    });
    return allComments;
  };

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'scrape') {
      runCollect().then(comments => {
        sendResponse({ ok: true, count: comments.length, json: JSON.stringify({ data: comments }, null, 2) });
      });
      return true;
    }
    if (request.action === 'quickScrape') {
      scan();
      navigator.clipboard.writeText(JSON.stringify({ data: allComments }, null, 2));
      showPanel(allComments.length);
      sendResponse({ ok: true, count: allComments.length });
      return true;
    }
  });
})();
