import React, { useEffect, useMemo, useRef, useState } from 'react';

// ── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'fb_comments_v1';
const SAMPLE_URL = 'https://www.facebook.com/share/p/1KaANBEDa6/';
const SAMPLE_COMMENTS = `王小明 | 我要抽大獎
陳小華 | Logitech 福袋買起來
林小美 | 我要抽雲端遊戲掌機
王小明 | 再留一次
張阿強 | 測試留言
李小芳 | 我要抽大獎
周大成 | 取消參加
黃小琪 | 好想要這個禮物`;

// ── Helpers ──────────────────────────────────────────────────────────────────
const parseList = (value) => value.split(',').map((v) => v.trim()).filter(Boolean);

function parsePrizes(raw) {
  return raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((line) => {
    const parts = line.split('|').map((p) => p.trim()).filter(Boolean);
    return { name: parts[0] || '未命名獎項', count: Math.max(1, Number(parts[1] || 1)) };
  });
}

function expandPrizeSlots(prizes) {
  return prizes.flatMap((p) => Array.from({ length: p.count }, () => p.name));
}

function parseComments(raw) {
  return raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((line) => {
    const pipe = line.split('|').map((p) => p.trim()).filter(Boolean);
    if (pipe.length >= 2) return { name: pipe[0], comment: pipe.slice(1).join(' | '), age: '' };
    const comma = line.split(',').map((p) => p.trim()).filter(Boolean);
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

// ── Icons ───────────────────────────────────────────────────────────────────
const iconSvgs = {
  spark: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2l1.7 5.3L19 9l-5.3 1.7L12 16l-1.7-5.3L5 9l5.3-1.7L12 2z" /></svg>,
  bolt: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" /></svg>,
  shield: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3z" /></svg>,
  trophy: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 3h8v3a4 4 0 01-8 0V3z" /><path d="M6 6H4a2 2 0 000 4h2" /><path d="M18 6h2a2 2 0 010 4h-2" /><path d="M12 10v5" /><path d="M9 21h6" /><path d="M10 15h4v3h-4z" /></svg>,
  upload: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" /></svg>,
  filter: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" /></svg>,
  download: <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" /></svg>,
};

// ── Tab definitions ───────────────────────────────────────────────────────────
const TABS = [
  { key: 'import', label: '📥 匯入留言', icon: '📥' },
  { key: 'conditions', label: '🎯 設定條件', icon: '🎯' },
  { key: 'results', label: '🎉 開獎結果', icon: '🎉' },
];

// ── Stepper progress ─────────────────────────────────────────────────────────
function Stepper({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {TABS.map((tab, idx) => {
        const stepNum = idx + 1;
        const isDone = stepNum < currentStep;
        const isActive = stepNum === currentStep;
        return (
          <React.Fragment key={tab.key}>
            <div className="flex flex-col items-center gap-1.5">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-all duration-300 ${
                isDone ? 'bg-primary text-white' : isActive ? 'bg-[#f0f2f5] text-primary border-2 border-primary' : 'bg-[#f0f2f5] text-warning/40 border-2 border-transparent'
              }`}>
                {isDone ? '✓' : tab.icon}
              </div>
              <span className={`text-xs font-bold whitespace-nowrap transition-colors ${isActive ? 'text-primary' : 'text-warning/50'}`}>
                {tab.label}
              </span>
            </div>
            {idx < TABS.length - 1 && (
              <div className={`h-1 w-16 md:w-24 mb-6 rounded-full transition-colors duration-300 ${isDone ? 'bg-primary' : 'bg-[#f0f2f5]'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Tab 1: Import ───────────────────────────────────────────────────────────
function TabImport({ postUrl, setPostUrl, postTitle, setPostTitle, commentInput, setCommentInput,
  fetchMeta, loadingFetch, onFetch, onLoadSample, onCsvImport }) {
  return (
    <div className="space-y-5">
      {/* Post URL */}
      <div>
        <label className="mb-2 block text-sm font-bold text-warning">Facebook 公開貼文網址</label>
        <div className="flex gap-2">
          <input
            className="input-ui flex-1"
            value={postUrl}
            onChange={(e) => setPostUrl(e.target.value)}
            placeholder="https://www.facebook.com/share/p/1KaANBEDa6/"
          />
          <button className="btn-secondary whitespace-nowrap" onClick={() => setPostUrl(SAMPLE_URL)}>範例</button>
        </div>
        <p className="mt-1.5 text-xs text-warning/60">支援：posts/、photo?fbid=、groups/、story_fbid= 等格式</p>
      </div>

      {/* Source selector */}
      <div>
        <label className="mb-2 block text-sm font-bold text-warning">抓取方式</label>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={onFetch} disabled={loadingFetch || !postUrl.trim()}>
            {loadingFetch ? '抓取中…' : '🔗 自動抓取留言'}
          </button>
          <button className="btn-secondary" onClick={onLoadSample}>📋 載入示範資料</button>
        </div>
      </div>

      {/* Manual CSV / text paste */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-bold text-warning">手動貼上留言（備用方案）</label>
          <button className="text-xs text-primary hover:underline font-bold" onClick={onCsvImport}>
            {iconSvgs.upload} 匯入 CSV 檔案
          </button>
        </div>
        <textarea
          className="input-ui min-h-[200px]"
          value={commentInput}
          onChange={(e) => setCommentInput(e.target.value)}
          placeholder={"王小明 | 我要抽大獎\n陳小華 | Logitech 福袋買起來\n李小芳 | 好想要這個禮物"}
        />
        <p className="mt-2 text-xs text-warning/60">支援「姓名 | 留言內容」或「姓名, 留言內容」格式，每行一筆</p>
      </div>

      {/* Post title */}
      <div>
        <label className="mb-2 block text-sm font-bold text-warning">活動名稱 / 貼文標題</label>
        <input className="input-ui" value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder="例如：三月粉專互動抽獎活動" />
      </div>

      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
        <p className="text-sm text-warning/80">{fetchMeta}</p>
      </div>
    </div>
  );
}

// ── Tab 2: Conditions ───────────────────────────────────────────────────────
function TabConditions({ prizeInput, setPrizeInput, winnerCount, setWinnerCount,
  seedInput, setSeedInput, dedupeMode, setDedupeMode,
  excludeKeywords, setExcludeKeywords, requiredKeywords, setRequiredKeywords,
  blacklistNames, setBlacklistNames, blacklistKeywords, setBlacklistKeywords,
  participantCount, filteredCount, prizes, prizeSlots, onDraw, onPrev }) {
  return (
    <div className="space-y-5">
      {/* Prize config */}
      <div>
        <label className="mb-2 block text-sm font-bold text-warning">獎品清單｜數量</label>
        <textarea
          className="input-ui min-h-[120px]"
          value={prizeInput}
          onChange={(e) => setPrizeInput(e.target.value)}
          placeholder={"頭獎 | 1\n貳獎 | 2\n參加獎 | 3"}
        />
        <p className="mt-1.5 text-xs text-warning/60">格式：獎項名稱 | 數量（每行一項）</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-bold text-warning">抽出名額（手動覆蓋）</label>
          <input className="input-ui" type="number" min="1" value={winnerCount} onChange={(e) => setWinnerCount(e.target.value)} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-bold text-warning">抽獎種子（選填）</label>
          <input className="input-ui" value={seedInput} onChange={(e) => setSeedInput(e.target.value)} placeholder="fb-march-2026" />
          <p className="mt-1 text-xs text-warning/50">相同種子可重現相同結果</p>
        </div>
      </div>

      {/* Filters */}
      <div className="border-t border-warning/10 pt-5">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-primary">{iconSvgs.filter}</span>
          <h3 className="text-sm font-black uppercase tracking-[0.14em] text-warning/70">篩選條件</h3>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-bold text-warning">重複處理</label>
            <select className="input-ui" value={dedupeMode} onChange={(e) => setDedupeMode(e.target.value)}>
              <option value="name">同名只保留一次</option>
              <option value="comment">同留言內容只保留一次</option>
              <option value="name-comment">同名 + 同留言才視為重複</option>
              <option value="none">不去重（留言越多機率越高）</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold text-warning">排除關鍵字</label>
            <input className="input-ui" value={excludeKeywords} onChange={(e) => setExcludeKeywords(e.target.value)} placeholder="測試, 取消" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold text-warning">只抽符合關鍵字</label>
            <input className="input-ui" value={requiredKeywords} onChange={(e) => setRequiredKeywords(e.target.value)} placeholder="抽大獎, 雲端遊戲掌機" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold text-warning">黑名單姓名</label>
            <input className="input-ui" value={blacklistNames} onChange={(e) => setBlacklistNames(e.target.value)} placeholder="測試帳號, 員工A" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-bold text-warning">黑名單關鍵字</label>
            <input className="input-ui" value={blacklistKeywords} onChange={(e) => setBlacklistKeywords(e.target.value)} placeholder="test, 機器人, 取消" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          ['原始筆數', participantCount, '留言總數（原始）'],
          ['合格筆數', filteredCount, '套用篩選後'],
          ['獎項數', prizeSlots.length, '本次抽出名額'],
        ].map(([label, value, tip]) => (
          <div key={label} className="rounded-2xl border border-warning/10 bg-white p-4 text-center shadow-soft">
            <div className="text-[10px] font-black uppercase tracking-[0.14em] text-warning/50">{label}</div>
            <div className="mt-2 text-3xl font-light text-primary">{value}</div>
            <div className="mt-1 text-[10px] text-warning/50">{tip}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <button className="btn-secondary" onClick={onPrev}>← 上一步</button>
        <button className="btn-primary flex-1" onClick={onDraw}>🎲 開始抽獎</button>
      </div>
    </div>
  );
}

// ── Tab 3: Results ───────────────────────────────────────────────────────────
function TabResults({ winners, filteredEntries, postTitle, onPrev, onPresentation,
  onCopyResults, onExportCsv, onSaveSession, onReset, onExportJson }) {
  return (
    <div className="space-y-6">
      {/* Winner cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-light text-warning">🎉 中獎名單</h3>
          <span className="pill bg-primary/10 text-primary border border-primary/20">
            {winners.length ? `已抽出 ${winners.length} 位` : '尚未抽獎'}
          </span>
        </div>

        {winners.length > 0 ? (
          <div className="space-y-3">
            {winners.map((winner, idx) => (
              <div key={`${winner.name}-${idx}`} className="clone-card">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-black uppercase tracking-[0.2em] text-primary">Winner {idx + 1}</div>
                    <div className="mt-1 text-sm font-black uppercase tracking-[0.14em] text-info">{winner.prize || '未指定獎項'}</div>
                    <div className="mt-2 text-2xl font-light text-warning">{winner.name}</div>
                  </div>
                  <div className="icon-chip">{iconSvgs.trophy}</div>
                </div>
                <div className="mt-3 text-sm leading-7 text-warning/75">{winner.comment || '（無留言內容）'}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="clone-card text-warning/60 text-center py-8">
            等待你按下「開始抽獎」<br />
            <span className="text-sm text-warning/40">可以先回到「設定條件」調整篩選規則</span>
          </div>
        )}
      </div>

      {/* Candidate pool */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-light text-warning">候選名單</h3>
          <span className="text-sm text-warning/50">{filteredEntries.length} 筆</span>
        </div>
        <div className="max-h-[300px] overflow-auto space-y-2 pr-1">
          {filteredEntries.length > 0 ? filteredEntries.map((item, idx) => (
            <div key={`${item.name}-${idx}`} className="rounded-2xl border border-warning/10 bg-white px-4 py-3 shadow-soft">
              <div className="text-xs font-black uppercase tracking-[0.14em] text-info">#{idx + 1}</div>
              <div className="mt-1 text-sm font-bold text-warning">{item.name}</div>
              <div className="mt-1 text-xs text-warning/70 leading-5">{item.comment || '（無留言內容）'}</div>
            </div>
          )) : (
            <div className="rounded-2xl border border-warning/10 bg-white p-5 text-warning/60">目前沒有合格的候選留言</div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button className="btn-secondary" onClick={onPrev}>← 回到設定</button>
        <button className="btn-primary" onClick={onPresentation} disabled={!winners.length}>🎬 中獎公布畫面</button>
        <button className="btn-secondary" onClick={onCopyResults} disabled={!winners.length}>📋 複製結果</button>
        <button className="btn-secondary" onClick={onExportCsv} disabled={!winners.length}>{iconSvgs.download} 匯出 CSV</button>
        <button className="btn-secondary" onClick={onExportJson} disabled={!winners.length}>匯出 JSON</button>
        <button className="btn-secondary" onClick={onSaveSession} disabled={!winners.length}>💾 保存紀錄</button>
        <button className="rounded-full border border-warning/20 bg-warning/5 px-4 py-2 text-xs font-black text-warning hover:bg-warning/10 transition" onClick={onReset}>🗑 清空重來</button>
      </div>
    </div>
  );
}

// ── Presentation Overlay ─────────────────────────────────────────────────────
function PresentationOverlay({ isOpen, stageLabel, stageName, stageComment, presentationWinners,
  presentationCursor, presentationPool, postTitle, onRevealNext, onFinish }) {
  const timerRef = useRef(null);

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#040b14]/84 p-4 backdrop-blur-xl">
      <div className="container">
        <div className="overflow-hidden rounded-[2.5rem] border border-white/10 bg-[radial-gradient(circle_at_top,rgba(100,233,245,.14),transparent_24%),linear-gradient(180deg,#102743_0%,#0a1a2f_52%,#08111e_100%)] px-6 py-7 text-white shadow-[0_40px_120px_rgba(0,0,0,.48)] lg:px-10 lg:py-10">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="text-xs font-black uppercase tracking-[0.22em] text-info">Winner Reveal</div>
              <div className="mt-3 text-5xl font-light text-white drop-shadow-[0_8px_28px_rgba(0,0,0,.35)]">{postTitle || '中獎公布畫面'}</div>
            </div>
            <button className="rounded-full border border-white/18 bg-[#0b1626] px-6 py-3 font-black text-white shadow-[0_10px_24px_rgba(0,0,0,.28)] transition hover:-translate-y-0.5 hover:bg-[#13233a]" onClick={onFinish}>關閉</button>
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
            <button className="btn-primary" onClick={onRevealNext}>
              {presentationCursor >= presentationPool.length ? '已全部揭曉' : '開始揭曉'}
            </button>
            {presentationCursor >= presentationPool.length && (
              <button className="btn-secondary !border-white/15 !bg-white/8 !text-white" onClick={onFinish}>完成並寫入結果</button>
            )}
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2">
            {presentationWinners.map((winner, idx) => (
              <div key={`${winner.name}-${idx}`} className="rounded-[1.5rem] border border-white/10 bg-black/18 p-5 shadow-[0_12px_34px_rgba(0,0,0,.22)]">
                <div className="text-sm font-black uppercase tracking-[0.16em] text-info">#{idx + 1}</div>
                <div className="mt-2 inline-flex rounded-full border border-primary/25 bg-primary/14 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#ffd7d7]">{winner.prize || '未指定獎項'}</div>
                <div className="mt-3 text-2xl font-black tracking-[-0.03em] text-white">{winner.name}</div>
                <div className="mt-2 text-sm leading-7 text-white/80">{winner.comment || '（無留言內容）'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Post URL Bar ─────────────────────────────────────────────────────────────
function PostUrlBar({ postUrl, postTitle }) {
  if (!postUrl) return null;
  return (
    <div className="bg-primary/5 border border-primary/15 rounded-2xl px-4 py-2.5 flex items-center gap-2">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-primary shrink-0">FB Post</span>
      <span className="text-sm text-warning/80 truncate flex-1">{postUrl}</span>
      {postTitle && <span className="text-xs text-warning/50 shrink-0 hidden sm:block">— {postTitle}</span>}
    </div>
  );
}

// ── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [currentStep, setCurrentStep] = useState(1);
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
  const [prizeInput, setPrizeInput] = useState('頭獎 | 1\n貳獎 | 2\n參加獎 | 3');
  const [winners, setWinners] = useState([]);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [stageName, setStageName] = useState('按下開始揭曉');
  const [stageComment, setStageComment] = useState('系統會在候選名單中滾動，最後停在中獎者。');
  const [stageLabel, setStageLabel] = useState('Presentation Mode');
  const [presentationWinners, setPresentationWinners] = useState([]);
  const [presentationCursor, setPresentationCursor] = useState(0);
  const [presentationPool, setPresentationPool] = useState([]);
  const [loadingFetch, setLoadingFetch] = useState(false);
  const [fetchMeta, setFetchMeta] = useState('💡 請貼上 Facebook 公開貼文網址，或直接在手動欄位粘貼留言名單。');
  const [drawSessions, setDrawSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
    catch { return []; }
  });
  const [fbUser, setFbUser] = useState(null);
  const [fbAccessToken, setFbAccessToken] = useState(null);
  const [fbLoading, setFbLoading] = useState(false);
  const timerRef = useRef(null);

  // ── FB OAuth check ────────────────────────────────────────────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (window.FB) {
        FB.getLoginStatus((response) => {
          if (response.status === 'connected') {
            fetchFbUserInfo(response.authResponse.accessToken);
          }
        });
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
    if (!window.FB) { setFetchMeta('Facebook SDK 尚未載入，請稍後再試。'); return; }
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
      { scope: 'pages_read_engagement,public_profile,email', return_scopes: true }
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

  // ── CSV import via file input ──────────────────────────────────────────────
  const handleCsvImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.txt';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target.result;
        // Try CSV parse: name,comment columns
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        if (lines[0] && lines[0].includes(',')) {
          // CSV mode
          const parsed = lines.map(line => {
            const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
            return { name: parts[0] || '', comment: parts.slice(1).join(', ') };
          }).filter(p => p.name);
          setCommentInput(parsed.map(p => `${p.name} | ${p.comment}`).join('\n'));
          setFetchMeta(`已匯入 CSV，共 ${parsed.length} 筆資料。`);
        } else {
          // Pipe-delimited mode
          setCommentInput(text);
          setFetchMeta(`已匯入檔案，共 ${lines.length} 行。`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // ── Fetch comments ────────────────────────────────────────────────────────
  const fetchComments = async () => {
    if (!postUrl.trim()) { setFetchMeta('⚠️ 請先貼上 Facebook 公開貼文網址。'); return; }
    setLoadingFetch(true);
    setFetchMeta('⏳ 正在抓取留言資料，請稍候...');
    try {
      const resp = await fetch(`/api/fetch-comments?url=${encodeURIComponent(postUrl.trim())}&fbAccessToken=${encodeURIComponent(fbAccessToken || '')}`);
      const data = await resp.json();
      if (!resp.ok || !data.ok) throw new Error(data.error || '抓取失敗');
      setCommentInput(data.comments.map(i => `${i.name} | ${i.comment}`).join('\n'));
      setPostTitle(prev => prev || data.postTitle || 'Facebook 公開貼文');
      setFetchMeta(`✅ 已抓到 ${data.extractedCount} 筆留言（${data.source || 'unknown'}）。${data.note || ''}`);
    } catch (err) {
      setFetchMeta(`❌ 抓取失敗：${err.message}。你可以直接在手動欄位粘貼留言名單。`);
    } finally {
      setLoadingFetch(false);
    }
  };

  const loadSample = () => {
    setPostUrl(SAMPLE_URL);
    setPostTitle('Facebook 互動抽獎示範');
    setCommentInput(SAMPLE_COMMENTS);
    setRequiredKeywords('抽');
    setExcludeKeywords('測試, 取消');
    setBlacklistNames('周大成');
    setPrizeInput('頭獎 | 1\n貳獎 | 1\n參加獎 | 1');
    setWinnerCount(3);
    setFetchMeta('✅ 已載入示範資料，共 8 筆留言，可直接按下「開始抽獎」測試。');
  };

  // ── Computed ─────────────────────────────────────────────────────────────
  const parsedEntries = useMemo(() => parseComments(commentInput), [commentInput]);

  const filteredEntries = useMemo(() => {
    const required = parseList(requiredKeywords).map(v => v.toLowerCase());
    const excluded = parseList(excludeKeywords).map(v => v.toLowerCase());
    const blackNames = parseList(blacklistNames).map(v => v.toLowerCase());
    const blackKeywords = parseList(blacklistKeywords).map(v => v.toLowerCase());
    const seen = new Set();

    return parsedEntries.filter((item) => {
      const name = item.name.trim();
      const comment = (item.comment || '').trim();
      const combined = `${name} ${comment}`.toLowerCase();
      const nameKey = name.toLowerCase();
      const commentKey = comment.toLowerCase();

      if (blackNames.includes(nameKey)) return false;
      if (excluded.some(kw => combined.includes(kw))) return false;
      if (blackKeywords.some(kw => combined.includes(kw))) return false;
      if (required.length && !required.some(kw => combined.includes(kw))) return false;

      let key = nameKey;
      if (dedupeMode === 'comment') key = commentKey;
      if (dedupeMode === 'name-comment') key = `${nameKey}__${commentKey}`;
      if (dedupeMode !== 'none') {
        if (seen.has(key)) return false;
        seen.add(key);
      }
      return true;
    });
  }, [parsedEntries, requiredKeywords, excludeKeywords, blacklistNames, blacklistKeywords, dedupeMode]);

  const participantCount = useMemo(() => new Set(parsedEntries.map(i => i.name.toLowerCase())).size, [parsedEntries]);
  const prizes = useMemo(() => parsePrizes(prizeInput), [prizeInput]);
  const prizeSlots = useMemo(() => expandPrizeSlots(prizes), [prizes]);

  const drawResult = useMemo(() => {
    const selected = shuffle(filteredEntries, seedInput).slice(0, Math.min(prizeSlots.length || Number(winnerCount || 1), filteredEntries.length));
    return selected.map((w, i) => ({ ...w, prize: prizeSlots[i] || `獎項 ${i + 1}` }));
  }, [filteredEntries, seedInput, winnerCount, prizeSlots]);

  // ── Draw actions ───────────────────────────────────────────────────────────
  const drawNow = () => {
    if (!filteredEntries.length) {
      setFetchMeta('⚠️ 目前沒有合格的留言可以抽獎。');
      return;
    }
    setWinners(drawResult);
    setCurrentStep(3);
    setFetchMeta(`✅ 抽出 ${drawResult.length} 位中獎者！可以點「中獎公布畫面」或直接複製結果。`);
  };

  const goToStep = (step) => {
    if (step === 2 && !commentInput.trim()) {
      setFetchMeta('⚠️ 請先在「匯入留言」填入留言資料。');
      return;
    }
    setCurrentStep(step);
  };

  const openPresentation = () => {
    if (!winners.length) return;
    setPresentationPool(winners);
    setPresentationWinners([]);
    setPresentationCursor(0);
    setStageLabel(`共 ${winners.length} 位待揭曉`);
    setStageName('按下開始揭曉');
    setStageComment('會先滾動候選人，最後停在中獎者。');
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
      setPresentationWinners(prev => [...prev, remaining]);
      setPresentationCursor(prev => prev + 1);
    }, 2500);
  };

  const finishPresentation = () => {
    setWinners(presentationWinners);
    saveDrawSession(presentationWinners);
    setOverlayOpen(false);
  };

  const saveDrawSession = (finalWinners = winners) => {
    if (!finalWinners.length) return;
    setDrawSessions(prev => [{
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
    }, ...prev].slice(0, 20));
    setFetchMeta('💾 已保存抽獎紀錄。');
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drawSessions));
  }, [drawSessions]);

  const copyResults = async () => {
    const output = [
      `活動：${postTitle || 'Facebook 抽獎活動'}`,
      ...winners.map((w, i) => `${i + 1}. ${w.prize || '未指定獎項'}｜${w.name}｜${w.comment || '（無留言內容）'}`)
    ].join('\n');
    await navigator.clipboard.writeText(output);
    setFetchMeta('📋 中獎結果已複製到剪貼簿。');
  };

  const exportCsv = () => {
    const header = '\uFEFF獎項,姓名,留言內容,時間';
    const rows = winners.map(w => [w.prize || '', w.name, w.comment || '', w.age || ''].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [header, ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `抽獎結果_${postTitle || '活動'}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFetchMeta('📥 CSV 檔案已下載。');
  };

  const exportJson = () => {
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
    a.download = `抽獎結果_${postTitle || '活動'}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFetchMeta('📥 JSON 檔案已下載。');
  };

  const resetAll = () => {
    setPostUrl(''); setPostTitle(''); setCommentInput('');
    setWinnerCount(1); setSeedInput(''); setDedupeMode('name');
    setExcludeKeywords(''); setRequiredKeywords(''); setBlacklistNames(''); setBlacklistKeywords('');
    setPrizeInput('頭獎 | 1\n貳獎 | 2\n參加獎 | 3');
    setFetchMeta('💡 請貼上 Facebook 公開貼文網址，或直接在手動欄位粘貼留言名單。');
    setWinners([]); setOverlayOpen(false);
    setPresentationWinners([]); setPresentationCursor(0); setPresentationPool([]);
    setCurrentStep(1);
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen overflow-x-hidden">
      <div className="fixed inset-0 -z-10 soft-grid opacity-40" />

      {/* Header */}
      <header className="container sticky top-4 z-30 pt-5">
        <div className="nav-shell flex items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="flex items-center gap-4">
            <div className="brand-mark flex h-10 w-10 items-center justify-center rounded-[1.1rem] text-white">{iconSvgs.spark}</div>
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-primary whitespace-nowrap">Comment Flow</div>
              <div className="text-[10px] text-warning/70 whitespace-nowrap">社群互動抽獎工具</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {fbUser ? (
              <div className="flex items-center gap-3">
                {fbUser.picture && <img src={fbUser.picture} alt={fbUser.name} className="h-9 w-9 rounded-full border-2 border-primary/30" />}
                <span className="hidden text-sm font-bold text-warning lg:block">{fbUser.name}</span>
                <button className="rounded-full border border-warning/15 bg-warning/8 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-warning transition hover:bg-warning/15" onClick={handleFbLogout}>登出</button>
              </div>
            ) : (
              <button className="rounded-full bg-primary px-4 py-2 text-xs font-black text-white transition hover:-translate-y-0.5" onClick={handleFbLogin} disabled={fbLoading}>
                {fbLoading ? '連接中...' : 'Facebook 登入'}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── LAYER 2: Tab/Stepper ─────────────────────────────────────────── */}
      <section className="container pb-8 pt-6">
        {/* Hero Banner */}
        <div className="mb-6 section-card p-6 reveal-up">
          <div className="flex flex-wrap items-center gap-3">
            <span className="pill">Facebook 留言抽獎工具</span>
          </div>
          <h1 className="mt-4 max-w-4xl text-xl md:text-2xl lg:text-3xl font-light leading-tight text-warning">
            把 Facebook 抽獎頁，換成目標站的完整品牌節奏。
          </h1>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[['📥 匯入留言', '支援 Graph API / 手動粘貼 / CSV 匯入'], ['🎯 設定條件', '關鍵字 / 黑名單 / 去重 / 獎品配置'], ['🎉 開獎揭曉', '中獎公布畫面 / CSV 匯出 / 紀錄保存']].map(([k, v]) => (
              <div key={k} className="clone-card reveal-right text-sm">
                <div className="font-black text-warning/60">{k}</div>
                <div className="mt-1 text-warning/80">{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Post URL Bar */}
        <div className="mb-4">
          <PostUrlBar postUrl={postUrl} postTitle={postTitle} />
        </div>

        {/* Stepper */}
        <Stepper currentStep={currentStep} />

        {/* Tab content */}
        <div className="section-card p-6 lg:p-8">
          {currentStep === 1 && (
            <TabImport
              postUrl={postUrl} setPostUrl={setPostUrl}
              postTitle={postTitle} setPostTitle={setPostTitle}
              commentInput={commentInput} setCommentInput={setCommentInput}
              fetchMeta={fetchMeta} loadingFetch={loadingFetch}
              onFetch={fetchComments}
              onLoadSample={loadSample}
              onCsvImport={handleCsvImport}
            />
          )}
          {currentStep === 2 && (
            <TabConditions
              prizeInput={prizeInput} setPrizeInput={setPrizeInput}
              winnerCount={winnerCount} setWinnerCount={setWinnerCount}
              seedInput={seedInput} setSeedInput={setSeedInput}
              dedupeMode={dedupeMode} setDedupeMode={setDedupeMode}
              excludeKeywords={excludeKeywords} setExcludeKeywords={setExcludeKeywords}
              requiredKeywords={requiredKeywords} setRequiredKeywords={setRequiredKeywords}
              blacklistNames={blacklistNames} setBlacklistNames={setBlacklistNames}
              blacklistKeywords={blacklistKeywords} setBlacklistKeywords={setBlacklistKeywords}
              participantCount={participantCount} filteredCount={filteredEntries.length}
              prizes={prizes} prizeSlots={prizeSlots}
              onDraw={drawNow} onPrev={() => setCurrentStep(1)}
            />
          )}
          {currentStep === 3 && (
            <TabResults
              winners={winners} filteredEntries={filteredEntries} postTitle={postTitle}
              onPrev={() => setCurrentStep(2)} onPresentation={openPresentation}
              onCopyResults={copyResults} onExportCsv={exportCsv}
              onSaveSession={() => saveDrawSession()} onReset={resetAll}
              onExportJson={exportJson}
            />
          )}
        </div>

        {/* Navigation arrows (mobile-friendly) */}
        <div className="mt-4 flex items-center justify-between px-2">
          <button className="text-sm text-warning/50 hover:text-warning transition disabled:opacity-30" onClick={() => setCurrentStep(s => Math.max(1, s - 1))} disabled={currentStep === 1}>
            ← 上一步
          </button>
          <span className="text-xs text-warning/40 font-bold">{currentStep} / 3</span>
          <button className="text-sm text-warning/50 hover:text-warning transition disabled:opacity-30" onClick={() => setCurrentStep(s => Math.min(3, s + 1))} disabled={currentStep === 3}>
            下一步 →
          </button>
        </div>
      </section>

      {/* History section */}
      <section className="container pb-12">
        <div className="section-card p-6 lg:p-8">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-sm font-black uppercase tracking-[0.18em] text-primary">Audit Trail</div>
              <h3 className="mt-2 text-xl font-light text-warning">最近的抽獎紀錄</h3>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {drawSessions.length ? drawSessions.slice(0, 5).map((session) => (
              <div key={session.id} className="rounded-2xl border border-warning/10 bg-white px-5 py-4 shadow-soft">
                <div className="text-xs font-black uppercase tracking-[0.14em] text-info">{new Date(session.createdAt).toLocaleString('zh-TW')}</div>
                <div className="mt-2 text-lg font-bold text-warning">{session.title}</div>
                <div className="mt-1.5 text-xs text-warning/60">Seed: {session.seedInput || 'random'} ｜ 去重: {session.dedupeMode} ｜ 候選: {session.filteredCount} ｜ 中獎: {session.winners.length}</div>
                <div className="mt-2 text-xs text-warning/75">{session.winners.map(w => `${w.prize || '未指定獎項'}：${w.name}`).join('／')}</div>
              </div>
            )) : <div className="rounded-2xl border border-warning/10 bg-white p-5 text-warning/50 text-sm">尚未保存任何抽獎紀錄</div>}
          </div>
        </div>
      </section>

      {/* Footer */}
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
              <p className="mt-5 max-w-2xl text-sm leading-8 text-white/72">適合活動抽獎、品牌互動與社群留言回饋。從留言整理、資格篩選、獎品配置到中獎公布，都能在同一個頁面完成。</p>
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

      {/* Presentation overlay */}
      <PresentationOverlay
        isOpen={overlayOpen}
        stageLabel={stageLabel}
        stageName={stageName}
        stageComment={stageComment}
        presentationWinners={presentationWinners}
        presentationCursor={presentationCursor}
        presentationPool={presentationPool}
        postTitle={postTitle}
        onRevealNext={revealNext}
        onFinish={finishPresentation}
      />
    </div>
  );
}
