import React, { useEffect, useMemo, useRef, useState } from 'react';

const SAMPLE_URL = 'https://www.facebook.com/share/p/1KaANBEDa6/';
const STORAGE_KEY = 'fb_comments_v1';
const sampleComments = `王小明 | 我要抽大獎\n陳小華 | Logitech 福袋買起來\n林小美 | 我要抽雲端遊戲掌機\n王小明 | 再留一次\n張阿強 | 測試留言\n李小芳 | 我要抽大獎\n周大成 | 取消參加\n黃小琪 | 好想要這個禮物`;

const parseList = (value) => value.split(',').map((v) => v.trim()).filter(Boolean);

function parsePrizes(raw) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|').map((part) => part.trim()).filter(Boolean);
      const name = parts[0] || '未命名獎項';
      const count = Math.max(1, Number(parts[1] || 1));
      return { name, count };
    });
}

function expandPrizeSlots(prizes) {
  return prizes.flatMap((prize) => Array.from({ length: prize.count }, () => prize.name));
}

function parseComments(raw) {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const pipe = line.split('|').map((part) => part.trim()).filter(Boolean);
      if (pipe.length >= 2) return { name: pipe[0], comment: pipe.slice(1).join(' | '), age: '' };
      const comma = line.split(',').map((part) => part.trim()).filter(Boolean);
      if (comma.length >= 2) return { name: comma[0], comment: comma.slice(1).join(', '), age: '' };
      return { name: line, comment: '', age: '' };
    });
}

function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h >>> 0) || 123456789;
}

function mulberry32(seed) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(items, seedText) {
  const result = [...items];
  const rand = seedText ? mulberry32(hashString(seedText)) : Math.random;
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const navItems = ['Overview', 'Automation', 'Filters', 'Reveal'];
const iconSvgs = {
  spark: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 2l1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7L12 2z" />
    </svg>
  ),
  bolt: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" />
    </svg>
  ),
  trophy: (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 3h8v3a4 4 0 01-8 0V3z" /><path d="M6 6H4a2 2 0 000 4h2" /><path d="M18 6h2a2 2 0 010 4h-2" /><path d="M12 10v5" /><path d="M9 21h6" /><path d="M10 15h4v3h-4z" />
    </svg>
  )
};

export default function App() {
  const [postUrl, setPostUrl] = useState('');
  const [postTitle, setPostTitle] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [winnerCount, setWinnerCount] = useState(1);
  const [seedInput, setSeedInput] = useState('');
  const [dedupeMode, setDedupeMode] = useState('name');
  const [excludeKeywords, setExcludeKeywords] = useState('');
  const [requiredKeywords, setRequiredKeywords] = useState('');
  const [blacklistNames, setBlacklistNames] = useState('');
  const [blacklistKeywords, setBlacklistKeywords] = useState('');
  const [fetchMeta, setFetchMeta] = useState('你也可以直接把整理好的留言名單貼進來。');
  const [loadingFetch, setLoadingFetch] = useState(false);
  const [prizeInput, setPrizeInput] = useState('頭獎 | 1\n貳獎 | 2\n參加獎 | 3');
  const [winners, setWinners] = useState([]);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [stageName, setStageName] = useState('按下開始揭曉');
  const [stageComment, setStageComment] = useState('系統會在候選名單中滾動，最後停在中獎者。');
  const [stageLabel, setStageLabel] = useState('Presentation Mode');
  const [presentationWinners, setPresentationWinners] = useState([]);
  const [presentationCursor, setPresentationCursor] = useState(0);
  const [presentationPool, setPresentationPool] = useState([]);
  const [drawSessions, setDrawSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  });
  // Facebook OAuth 登入狀態
  const [fbUser, setFbUser] = useState(null);
  const [fbAccessToken, setFbAccessToken] = useState(null);
  const [fbLoading, setFbLoading] = useState(false);
  const timerRef = useRef(null);

  // 檢查 FB 登入狀態（頁面載入時）
  useEffect(() => {
    const checkFbStatus = () => {
      if (window.FB) {
        FB.getLoginStatus((response) => {
          if (response.status === 'connected') {
            fetchFbUserInfo(response.authResponse.accessToken);
          }
        });
      }
    };
    // 等 FB SDK 載入後再檢查
    const interval = setInterval(() => {
      if (window.FB) {
        checkFbStatus();
        clearInterval(interval);
      }
    }, 300);
    return () => clearInterval(interval);
  }, []);

  const fetchFbUserInfo = (accessToken) => {
    setFbLoading(true);
    FB.api('/me', { fields: 'name,picture', access_token: accessToken }, (resp) => {
      if (!resp.error) {
        setFbUser({ name: resp.name, picture: resp.picture?.data?.url });
        setFbAccessToken(accessToken);
      }
      setFbLoading(false);
    });
  };

  const handleFbLogin = () => {
    if (!window.FB) {
      setFetchMeta('Facebook SDK 尚未載入，請稍後再試。');
      return;
    }
    setFbLoading(true);
    FB.login(
      (response) => {
        if (response.authResponse) {
          fetchFbUserInfo(response.authResponse.accessToken);
          setFetchMeta('Facebook 登入成功！現在可以選擇要抓取留言的粉專貼文。');
        } else {
          setFetchMeta('Facebook 登入已取消或失敗。');
          setFbLoading(false);
        }
      },
      {
        scope: 'pages_read_engagement,read_custom_friendlists',
        return_scopes: true,
      }
    );
  };

  const handleFbLogout = () => {
    if (window.FB) {
      FB.logout(() => {
        setFbUser(null);
        setFbAccessToken(null);
        setFetchMeta('已登出 Facebook。');
      });
    }
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drawSessions));
  }, [drawSessions]);

  const parsedEntries = useMemo(() => parseComments(commentInput), [commentInput]);
  const filteredEntries = useMemo(() => {
    const required = parseList(requiredKeywords).map((v) => v.toLowerCase());
    const excluded = parseList(excludeKeywords).map((v) => v.toLowerCase());
    const blackNames = parseList(blacklistNames).map((v) => v.toLowerCase());
    const blackKeywords = parseList(blacklistKeywords).map((v) => v.toLowerCase());
    const seen = new Set();

    return parsedEntries.filter((item) => {
      const name = item.name.trim();
      const comment = (item.comment || '').trim();
      const nameKey = name.toLowerCase();
      const commentKey = comment.toLowerCase();
      const combined = `${name} ${comment}`.toLowerCase();

      if (blackNames.includes(nameKey)) return false;
      if (excluded.some((keyword) => combined.includes(keyword))) return false;
      if (blackKeywords.some((keyword) => combined.includes(keyword))) return false;
      if (required.length && !required.some((keyword) => combined.includes(keyword))) return false;

      let key = '';
      if (dedupeMode === 'name') key = nameKey;
      if (dedupeMode === 'comment') key = commentKey;
      if (dedupeMode === 'name-comment') key = `${nameKey}__${commentKey}`;
      if (dedupeMode !== 'none') {
        if (seen.has(key)) return false;
        seen.add(key);
      }
      return true;
    });
  }, [parsedEntries, requiredKeywords, excludeKeywords, blacklistNames, blacklistKeywords, dedupeMode]);

  const participantCount = useMemo(() => new Set(filteredEntries.map((item) => item.name.toLowerCase())).size, [filteredEntries]);
  const prizes = useMemo(() => parsePrizes(prizeInput), [prizeInput]);
  const prizeSlots = useMemo(() => expandPrizeSlots(prizes), [prizes]);
  const drawResult = useMemo(() => {
    const selected = shuffle(filteredEntries, seedInput).slice(0, Math.min(prizeSlots.length || Number(winnerCount || 1), filteredEntries.length));
    return selected.map((winner, index) => ({ ...winner, prize: prizeSlots[index] || `獎項 ${index + 1}` }));
  }, [filteredEntries, seedInput, winnerCount, prizeSlots]);

  const fetchComments = async () => {
    if (!postUrl.trim()) {
      setFetchMeta('請先貼上 Facebook 公開貼文網址。');
      return;
    }
    setLoadingFetch(true);
    setFetchMeta('正在擷取公開貼文留言資料，會盡量抓更多公開可見留言...');
    try {
      const response = await fetch(`/api/fetch-comments?url=${encodeURIComponent(postUrl.trim())}`);
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || '抓取失敗');
      setCommentInput(data.comments.map((item) => `${item.name} | ${item.comment}`).join('\n'));
      setPostTitle((prev) => prev || data.postTitle || 'Facebook 公開貼文');
      setFetchMeta(`已抓到 ${data.extractedCount} 筆可公開取得留言；貼文頁顯示 ${data.commentCountText || '未知'}。${data.note || ''}`);
    } catch (error) {
      setFetchMeta(`抓取失敗：${error.message}。你仍可改用手動貼上留言名單。`);
    } finally {
      setLoadingFetch(false);
    }
  };

  const drawNow = () => setWinners(drawResult);

  const resetAll = () => {
    setPostUrl('');
    setPostTitle('');
    setCommentInput('');
    setWinnerCount(1);
    setSeedInput('');
    setDedupeMode('name');
    setExcludeKeywords('');
    setRequiredKeywords('');
    setBlacklistNames('');
    setBlacklistKeywords('');
    setPrizeInput('頭獎 | 1\n貳獎 | 2\n參加獎 | 3');
    setFetchMeta('你也可以直接把整理好的留言名單貼進來。');
    setWinners([]);
    setOverlayOpen(false);
    setPresentationWinners([]);
    setPresentationCursor(0);
    setPresentationPool([]);
  };

  const openPresentation = () => {
    setPresentationPool(drawResult);
    setPresentationWinners([]);
    setPresentationCursor(0);
    setStageLabel(drawResult.length ? `共 ${drawResult.length} 位待揭曉` : '沒有可揭曉名單');
    setStageName(drawResult.length ? '按下開始揭曉' : '目前沒有合格留言');
    setStageComment(drawResult.length ? '會先滾動候選人，最後停在本輪中獎者。' : '請先調整條件或匯入更多留言。');
    setOverlayOpen(true);
  };

  const revealNext = () => {
    if (presentationCursor >= presentationPool.length) return;
    const remaining = presentationPool[presentationCursor];
    const roulettePool = shuffle(presentationPool.slice(presentationCursor), `${seedInput}-${presentationCursor}`);
    let tick = 0;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const current = roulettePool[tick % roulettePool.length] || remaining;
      setStageLabel(`Revealing Winner ${presentationCursor + 1}`);
      setStageName(current.name);
      setStageComment(current.comment || '（無留言內容）');
      tick += 1;
    }, 100);

    setTimeout(() => {
      clearInterval(timerRef.current);
      setStageLabel(`Winner ${presentationCursor + 1}`);
      setStageName(remaining.name);
      setStageComment(remaining.comment || '（無留言內容）');
      setPresentationWinners((prev) => [...prev, remaining]);
      setPresentationCursor((prev) => prev + 1);
    }, 2500);
  };

  const finishPresentation = () => {
    setWinners(presentationWinners);
    saveDrawSession(presentationWinners);
    setOverlayOpen(false);
  };

  const saveDrawSession = (finalWinners = winners) => {
    if (!finalWinners.length) return;
    setDrawSessions((prev) => [
      {
        id: Date.now(),
        title: postTitle || 'Facebook 抽獎活動',
        postUrl,
        seedInput,
        dedupeMode,
        winnerCount,
        createdAt: new Date().toISOString(),
        winners: finalWinners,
        participantCount,
        filteredCount: filteredEntries.length,
      },
      ...prev,
    ].slice(0, 20));
    setFetchMeta('已保存抽獎紀錄。');
  };

  const exportSessionJson = () => {
    const payload = {
      title: postTitle || 'Facebook 抽獎活動',
      postUrl,
      seedInput,
      dedupeMode,
      winnerCount,
      participantCount,
      filteredCount: filteredEntries.length,
      winners,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'facebook-draw-session.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFetchMeta('已匯出抽獎紀錄 JSON。');
  };

  const copyResults = async () => {
    const output = [
      `活動：${postTitle || 'Facebook 抽獎活動'}`,
      ...winners.map((w, i) => `${i + 1}. ${w.prize || '未指定獎項'}｜${w.name}｜${w.comment || '（無留言內容）'}`)
    ].join('\n');
    await navigator.clipboard.writeText(output);
    setFetchMeta('中獎結果已複製。');
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="fixed inset-0 -z-10 soft-grid opacity-40" />

      <header className="container sticky top-4 z-30 pt-5">
        <div className="nav-shell flex items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-4">
            <div className="brand-mark flex h-10 w-10 items-center justify-center rounded-[1.1rem] text-white">{iconSvgs.spark}</div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-primary whitespace-nowrap">Comment Flow</div>
              <div className="text-[10px] text-warning/70 whitespace-nowrap">社群互動抽獎工具</div>
            </div>
          </div>
          <nav className="hidden items-center gap-8 md:flex">
            {navItems.map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="hidden md:block text-xs font-black uppercase tracking-[0.14em] text-warning/55 transition hover:text-warning whitespace-nowrap">
                {item}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {fbUser ? (
              <div className="flex items-center gap-3">
                {fbUser.picture && (
                  <img src={fbUser.picture} alt={fbUser.name} className="h-9 w-9 rounded-full border-2 border-primary/30" />
                )}
                <span className="hidden text-sm font-bold text-warning lg:block">{fbUser.name}</span>
                <button
                  className="rounded-full border border-warning/15 bg-warning/8 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-warning transition hover:bg-warning/15"
                  onClick={handleFbLogout}
                >
                  登出
                </button>
              </div>
            ) : (
              <button
                className="rounded-full bg-primary px-4 py-2 text-xs font-black text-white transition hover:-translate-y-0.5"
                onClick={handleFbLogin}
                disabled={fbLoading}
              >
                {fbLoading ? '連接中...' : 'Facebook 登入'}
              </button>
            )}
            <button className="btn-primary hidden lg:block text-sm" onClick={drawNow}>Launch Picker</button>
          </div>
        </div>
      </header>

      <section id="overview" className="c-banner container pb-10">
        <div className="grid items-stretch gap-6 lg:grid-cols-[1.15fr_.85fr]">
          <div className="section-card overflow-hidden px-7 py-8 reveal-up lg:px-10 lg:py-12">
            <div className="flex flex-wrap items-center gap-3">
              <span className="pill">Facebook 留言抽獎工具</span>
            </div>
            <h1 className="mt-6 max-w-4xl text-2xl md:text-3xl lg:text-4xl font-light leading-tight text-warning">
              把 Facebook 抽獎頁，換成目標站的完整品牌節奏。
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-warning/75">
              專為 Facebook 單篇貼文留言活動設計的抽獎工具。支援貼文留言匯入、關鍵字篩選、黑名單排除、獎品配置與中獎揭曉，讓你從整理名單到公布結果都能在同一頁完成。
            </p>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                ['Automation', '公開貼文自動抓留言'],
                ['Filter Layer', '關鍵字 / 黑名單 / 去重'],
                ['Reveal Stage', '中獎公布動畫與結果頁']
              ].map(([kicker, text], idx) => (
                <div key={kicker} className="clone-card reveal-right" style={{ animationDelay: `${idx * 120}ms` }}>
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-black uppercase tracking-[0.18em] text-info">{kicker}</div>
                    <div className="icon-chip">{idx === 0 ? iconSvgs.bolt : idx === 1 ? iconSvgs.shield : iconSvgs.trophy}</div>
                  </div>
                  <div className="mt-5 text-xl font-bold leading-8 text-warning">{text}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="section-card px-7 py-8 reveal-up lg:px-8" style={{ animationDelay: '120ms' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-black uppercase tracking-[0.18em] text-warning/55">Live Metrics</div>
                <div className="mt-2 text-xl md:text-2xl font-light text-warning">即時抽獎數據</div>
              </div>
              <div className="icon-chip floaty">{iconSvgs.spark}</div>
            </div>
            <div className="mt-6 grid gap-4">
              {[
                ['Valid Entries', parsedEntries.length, '原始 / 匯入後留言總筆數'],
                ['Unique Participants', participantCount, '套用規則後的唯一參與者'],
                ['Winners', winners.length, '目前已經抽出的中獎名單']
              ].map(([label, value, desc]) => (
                <div key={label} className="metric-card">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-warning/45">{label}</div>
                  <div className="mt-3 text-5xl font-light leading-none text-warning whitespace-nowrap">{value}</div>
                  <div className="mt-3 text-sm leading-7 text-warning/65">{desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="automation" className="container pb-8">
        <div className="mb-6 section-card p-6 reveal-up">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-black uppercase tracking-[0.18em] text-primary">Prize Setup</div>
              <div className="mt-2 text-lg md:text-xl font-light text-warning">設定獎品清單與數量，讓抽獎結果直接對應獎項。</div>
              <div className="mt-3 max-w-3xl text-sm leading-8 text-warning/72">使用「獎品名稱 | 數量」格式建立獎項，例如：頭獎 | 1、貳獎 | 2。系統會依照獎品總數自動配置中獎名單。</div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" onClick={drawNow}>依獎品配置抽獎</button>
            </div>
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            ['設定獎品名單', '輸入每個獎項與數量，建立實際抽獎結構。'],
            ['篩選合格留言', '依關鍵字、黑名單、去重邏輯過濾名單。'],
            ['公布每位得獎者', '每位中獎者會直接對應到所屬獎品。']
          ].map((item, index) => (
            <div key={item[0]} className="section-card p-6 reveal-up" style={{ animationDelay: `${index * 140}ms` }}>
              <div className="text-sm font-black uppercase tracking-[0.18em] text-primary">Step 0{index + 1}</div>
              <div className="mt-4 text-2xl font-light text-warning">{item[0]}</div>
              <div className="mt-3 text-sm leading-7 text-warning/70">{item[1]}</div>
            </div>
          ))}
        </div>
      </section>

      <main className="container grid gap-6 pb-16 lg:grid-cols-[1.05fr_.95fr]">
        <section id="filters" className="section-card p-6 lg:p-8">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <div className="text-sm font-black uppercase tracking-[0.18em] text-warning/55">Data Input</div>
              <h2 className="mt-2 text-lg md:text-xl font-light text-warning">匯入留言與設定抽獎條件</h2>
            </div>
            <div className="text-sm leading-7 text-warning/70">支援貼文匯入、條件篩選與獎項配置。</div>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <label className="mb-2 block text-sm font-bold text-warning">Facebook 公開貼文網址</label>
              <input className="input-ui" value={postUrl} onChange={(e) => setPostUrl(e.target.value)} placeholder="https://www.facebook.com/share/p/1KaANBEDa6/" />
            </div>
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" onClick={fetchComments} disabled={loadingFetch}>{loadingFetch ? '抓取中...' : '自動抓取留言'}</button>
              <button className="btn-info" onClick={() => setPostUrl(SAMPLE_URL)}>載入示範貼文網址</button>
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-warning">活動名稱 / 貼文標題</label>
              <input className="input-ui" value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="例如：三月粉專互動抽獎活動" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-warning">留言清單</label>
              <textarea className="input-ui min-h-[240px]" value={commentInput} onChange={(e) => setCommentInput(e.target.value)} placeholder="王小明 | 我要抽大獎" />
              <p className="mt-3 text-sm leading-7 text-warning/70">{fetchMeta}</p>
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-warning">獎品清單 | 數量</label>
              <textarea className="input-ui min-h-[140px]" value={prizeInput} onChange={(e) => setPrizeInput(e.target.value)} placeholder="頭獎 | 1&#10;貳獎 | 2&#10;參加獎 | 3" />
              <p className="mt-3 text-sm leading-7 text-warning/70">系統會依照獎品總數自動決定抽出名額，並把每位中獎者對應到獎項。</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div><label className="mb-2 block text-sm font-bold text-warning">抽出名額（手動覆蓋）</label><input className="input-ui" type="number" min="1" value={winnerCount} onChange={(e) => setWinnerCount(e.target.value)} /></div>
              <div><label className="mb-2 block text-sm font-bold text-warning">抽獎種子（選填）</label><input className="input-ui" value={seedInput} onChange={(e) => setSeedInput(e.target.value)} placeholder="fb-march-2026" /></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold text-warning">重複處理</label>
                <select className="input-ui" value={dedupeMode} onChange={(e) => setDedupeMode(e.target.value)}>
                  <option value="name">同名只保留一次</option>
                  <option value="comment">同留言內容只保留一次</option>
                  <option value="name-comment">同名 + 同留言才視為重複</option>
                  <option value="none">不去重，留言越多機率越高</option>
                </select>
              </div>
              <div><label className="mb-2 block text-sm font-bold text-warning">排除關鍵字</label><input className="input-ui" value={excludeKeywords} onChange={(e) => setExcludeKeywords(e.target.value)} placeholder="測試, 取消" /></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div><label className="mb-2 block text-sm font-bold text-warning">只抽符合關鍵字</label><input className="input-ui" value={requiredKeywords} onChange={(e) => setRequiredKeywords(e.target.value)} placeholder="抽大獎, 雲端遊戲掌機" /></div>
              <div><label className="mb-2 block text-sm font-bold text-warning">黑名單姓名</label><input className="input-ui" value={blacklistNames} onChange={(e) => setBlacklistNames(e.target.value)} placeholder="測試帳號, 員工A" /></div>
            </div>
            <div><label className="mb-2 block text-sm font-bold text-warning">黑名單關鍵字</label><input className="input-ui" value={blacklistKeywords} onChange={(e) => setBlacklistKeywords(e.target.value)} placeholder="test, 機器人, 取消" /></div>
            <div className="flex flex-wrap gap-3">
              <button className="btn-primary" onClick={drawNow}>開始抽獎</button>
              <button className="btn-secondary" onClick={openPresentation}>中獎公布畫面</button>
              <button
                className="btn-secondary"
                onClick={() => {
                  setPostTitle('Facebook 互動抽獎示範');
                  setCommentInput(sampleComments);
                  setRequiredKeywords('抽');
                  setExcludeKeywords('測試, 取消');
                  setBlacklistNames('周大成');
                  setPrizeInput('頭獎 | 1\n貳獎 | 1\n參加獎 | 1');
                  setWinnerCount(3);
                }}
              >
                載入示範資料
              </button>
              <button className="btn-secondary" onClick={copyResults}>複製中獎結果</button>
              <button className="btn-secondary" onClick={() => saveDrawSession()}>保存抽獎紀錄</button>
              <button className="btn-secondary" onClick={exportSessionJson}>匯出 JSON</button>
              <button className="rounded-full bg-warning px-6 py-3.5 font-black text-white" onClick={resetAll}>清空內容</button>
            </div>
          </div>
        </section>

        <section id="reveal" className="section-card p-6 lg:p-8">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="pill border-primary/15 bg-primary/10 text-primary">{winners.length ? `已抽出 ${winners.length} 位` : '尚未抽獎'}</div>
              <h2 className="mt-3 text-xl md:text-2xl font-light text-warning">Draw Result</h2>
            </div>
            <div className="text-sm leading-7 text-warning/70">候選池與中獎名單同步顯示</div>
          </div>

          <div className="mt-6 grid gap-4">
            {winners.length ? winners.map((winner, idx) => (
              <div key={`${winner.name}-${idx}`} className="clone-card">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-primary">Winner {idx + 1}</div>
                    <div className="mt-3 text-sm font-black uppercase tracking-[0.18em] text-info">{winner.prize || '未指定獎項'}</div>
                    <div className="mt-3 text-2xl font-light text-warning">{winner.name}</div>
                  </div>
                  <div className="icon-chip">{iconSvgs.trophy}</div>
                </div>
                <div className="mt-4 text-base leading-8 text-warning/75">{winner.comment || '（無留言內容）'}</div>
              </div>
            )) : <div className="clone-card text-warning/70">等待你開始抽獎。</div>}
          </div>

          <div className="mt-8 flex items-center justify-between">
            <h3 className="text-xl font-light text-warning">Candidate Pool</h3>
            <div className="text-sm text-warning/60">{filteredEntries.length} 筆</div>
          </div>
          <div className="mt-4 max-h-[420px] space-y-3 overflow-auto pr-2">
            {filteredEntries.length ? filteredEntries.map((item, idx) => (
              <div key={`${item.name}-${idx}`} className="rounded-[1.5rem] border border-warning/10 bg-white px-5 py-4 shadow-soft">
                <div className="text-sm font-black uppercase tracking-[0.16em] text-info">#{idx + 1}</div>
                <div className="mt-1 text-lg font-bold text-warning">{item.name}</div>
                <div className="mt-1 text-sm leading-7 text-warning/75">{item.comment || '（無留言內容）'}</div>
              </div>
            )) : <div className="rounded-[1.5rem] border border-warning/10 bg-white p-5 text-warning/70">目前沒有可抽獎的有效留言。</div>}
          </div>
        </section>
      </main>

      <section className="container pb-12">
        <div className="section-card p-6 lg:p-8 mb-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-sm font-black uppercase tracking-[0.18em] text-primary">Audit Trail</div>
              <h3 className="mt-2 text-xl font-light text-warning">最近的抽獎紀錄</h3>
            </div>
            <div className="text-sm leading-7 text-warning/70">保存最近 20 筆抽獎 session，便於對外說明與內部備查。</div>
          </div>
          <div className="mt-6 grid gap-4">
            {drawSessions.length ? drawSessions.map((session) => (
              <div key={session.id} className="rounded-[1.5rem] border border-warning/10 bg-white px-5 py-4 shadow-soft">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-info">{new Date(session.createdAt).toLocaleString('zh-TW')}</div>
                <div className="mt-2 text-xl font-bold text-warning">{session.title}</div>
                <div className="mt-2 text-sm leading-7 text-warning/72">Seed: {session.seedInput || 'random'} ｜ 去重: {session.dedupeMode} ｜ 候選: {session.filteredCount} ｜ 中獎: {session.winners.length}</div>
                <div className="mt-3 text-sm leading-7 text-warning/75">{session.winners.map((w) => `${w.prize || '未指定獎項'}：${w.name}`).join('／')}</div>
              </div>
            )) : <div className="rounded-[1.5rem] border border-warning/10 bg-white p-5 text-warning/70">尚未保存任何抽獎紀錄。</div>}
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            ['快速匯入', '可直接匯入 Facebook 公開貼文留言，快速建立抽獎名單。'],
            ['條件篩選', '支援關鍵字、黑名單與去重邏輯，提升抽獎精準度。'],
            ['公布結果', '中獎者可直接對應獎項，並支援揭曉畫面與結果複製。']
          ].map((item, idx) => (
            <div key={item[0]} className="clone-card reveal-up" style={{ animationDelay: `${idx * 100}ms` }}>
              <div className="text-sm font-black uppercase tracking-[0.18em] text-primary">{item[0]}</div>
              <div className="mt-4 text-base leading-8 text-warning/75">{item[1]}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="container pb-12">
        <div className="section-card p-6 lg:p-8">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-sm font-black uppercase tracking-[0.18em] text-primary">Update Log</div>
              <h3 className="mt-2 text-xl font-light text-warning">功能更新紀錄</h3>
            </div>
            <div className="text-sm leading-7 text-warning/70">最近新增的功能會顯示在這裡。</div>
          </div>
          <div className="mt-6 grid gap-4">
            {[
              ['2026-03-10', '新增獎品清單與數量設定，抽獎結果可直接對應獎項。'],
              ['2026-03-10', '加入關鍵字篩選、黑名單排除與多種去重規則。'],
              ['2026-03-10', '新增中獎揭曉畫面與中獎結果複製功能。'],
              ['2026-03-10', '重新整理整體版面，調整為更完整的產品化介面。']
            ].map(([date, text]) => (
              <div key={`${date}-${text}`} className="rounded-[1.5rem] border border-warning/10 bg-white px-5 py-4 shadow-soft">
                <div className="text-xs font-black uppercase tracking-[0.18em] text-info">{date}</div>
                <div className="mt-2 text-base leading-8 text-warning/80">{text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="footer-shell">
        <div className="container py-10 text-white">
          <div className="grid gap-8 md:grid-cols-[1.1fr_.9fr] md:items-end">
            <div>
              <div className="flex items-center gap-4">
                <div className="brand-mark flex h-12 w-12 items-center justify-center rounded-[1.1rem] text-white">{iconSvgs.spark}</div>
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.25em] text-info">Comment Flow</div>
                  <div className="mt-1 text-xl md:text-3xl font-light">社群互動抽獎工具</div>
                </div>
              </div>
              <p className="mt-5 max-w-2xl text-sm leading-8 text-white/72">
                適合活動抽獎、品牌互動與社群留言回饋。從留言整理、資格篩選、獎品配置到中獎公布，都能在同一個頁面完成。
              </p>
            </div>
            <div className="grid gap-3 text-sm text-white/72 md:justify-items-end">
              <div>支援公開貼文留言匯入</div>
              <div>支援獎品清單與數量設定</div>
              <div>支援關鍵字篩選與黑名單排除</div>
              <div>支援中獎揭曉與結果複製</div>
            </div>
          </div>
        </div>
      </footer>

      {overlayOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#040b14]/84 p-4 backdrop-blur-xl">
          <div className="container">
            <div className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(100,233,245,.14),transparent_24%),linear-gradient(180deg,#102743_0%,#0a1a2f_52%,#08111e_100%)] px-6 py-7 text-white shadow-[0_40px_120px_rgba(0,0,0,.48)] lg:px-10 lg:py-10">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.22em] text-info">Winner Reveal</div>
                  <div className="mt-3 text-5xl font-light text-white drop-shadow-[0_8px_28px_rgba(0,0,0,.35)]">{postTitle || '中獎公布畫面'}</div>
                </div>
                <button className="rounded-full border border-white/18 bg-[#0b1626] px-6 py-3 font-black text-white shadow-[0_10px_24px_rgba(0,0,0,.28)] transition hover:-translate-y-0.5 hover:bg-[#13233a]" onClick={() => setOverlayOpen(false)}>關閉</button>
              </div>
              <div className="mt-10 grid place-items-center">
                <div className="flex aspect-square w-full max-w-[520px] animate-pulse-winner flex-col items-center justify-center rounded-full border border-white/12 bg-[radial-gradient(circle,rgba(255,255,255,.16),rgba(255,255,255,.04)_42%,rgba(8,17,30,.18)_70%)] p-10 text-center shadow-[0_24px_80px_rgba(0,0,0,.45)]">
                  <div className="text-sm font-black uppercase tracking-[0.24em] text-info drop-shadow-[0_4px_20px_rgba(100,233,245,.25)]">{stageLabel}</div>
                  {presentationWinners[presentationWinners.length - 1]?.prize && (
                    <div className="mt-5 rounded-full border border-primary/30 bg-primary/18 px-5 py-2 text-sm font-black uppercase tracking-[0.18em] text-[#ffd7d7] shadow-[0_12px_30px_rgba(255,102,102,.18)]">
                      {presentationWinners[presentationWinners.length - 1]?.prize}
                    </div>
                  )}
                  <div className="mt-6 text-3xl md:text-4xl font-black leading-none tracking-[-0.04em] text-white drop-shadow-[0_8px_24px_rgba(0,0,0,.5)]">{stageName}</div>
                  <div className="mt-5 max-w-md text-lg leading-8 text-white/86">{stageComment}</div>
                </div>
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button className="btn-primary" onClick={revealNext}>開始揭曉</button>
                <button className="btn-secondary !border-white/15 !bg-white/8 !text-white" onClick={finishPresentation}>完成並寫入結果</button>
              </div>
              <div className="mt-8 grid gap-3 md:grid-cols-2">
                {presentationWinners.map((winner, idx) => (
                  <div key={`${winner.name}-${idx}`} className="rounded-[1.5rem] border border-white/10 bg-black/18 p-5 shadow-[0_12px_34px_rgba(0,0,0,.22)]">
                    <div className="text-sm font-black uppercase tracking-[0.16em] text-info">#{idx + 1}</div>
                    <div className="mt-2 inline-flex rounded-full border border-primary/25 bg-primary/14 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#ffd7d7]">{winner.prize || '未指定獎項'}</div>
                    <div className="mt-3 text-2xl font-black tracking-[-0.03em] text-white">{winner.name}</div>
                    <div className="mt-2 text-sm leading-7 text-white/80">{winner.comment}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
