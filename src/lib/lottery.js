/**
 * 抽獎核心演算法 — 純 utility,無 React 依賴
 * 可在 server (api/draw.js) 與 client (src/App.jsx) 共用
 */

export const parseList = (value) =>
  value.split(',').map((v) => v.trim()).filter(Boolean);

export function parsePrizes(raw) {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|').map((p) => p.trim()).filter(Boolean);
      return { name: parts[0] || '未命名獎項', count: Math.max(1, Number(parts[1] || 1)) };
    });
}

export function expandPrizeSlots(prizes) {
  return prizes.flatMap((p) => Array.from({ length: p.count }, () => p.name));
}

export function parseComments(raw) {
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const pipe = line.split('|').map((p) => p.trim()).filter(Boolean);
      if (pipe.length >= 2) return { name: pipe[0], comment: pipe.slice(1).join(' | '), age: '' };
      const comma = line.split(',').map((p) => p.trim()).filter(Boolean);
      if (comma.length >= 2) return { name: comma[0], comment: comma.slice(1).join(', '), age: '' };
      return { name: line, comment: '', age: '' };
    });
}

export function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h >>> 0) || 123456789;
}

export function mulberry32(seed) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(items, seedText) {
  const result = [...items];
  const rand = seedText ? mulberry32(hashString(seedText)) : Math.random;
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 套用 4 種去重 + 條件篩選
 * @param {Array} parsedEntries - parseComments 結果
 * @param {Object} filters - { excludeKeywords, requiredKeywords, blacklistNames, blacklistKeywords, dedupeMode }
 */
export function applyFilters(parsedEntries, filters) {
  const {
    excludeKeywords = '',
    requiredKeywords = '',
    blacklistNames = '',
    blacklistKeywords = '',
    dedupeMode = 'name',
  } = filters;

  const required = parseList(requiredKeywords).map((v) => v.toLowerCase());
  const excluded = parseList(excludeKeywords).map((v) => v.toLowerCase());
  const blackNames = parseList(blacklistNames).map((v) => v.toLowerCase());
  const blackKeywords = parseList(blacklistKeywords).map((v) => v.toLowerCase());

  const seen = new Set();

  return parsedEntries.filter((item) => {
    const name = (item.name || '').trim();
    const comment = (item.comment || '').trim();
    const combined = `${name} ${comment}`.toLowerCase();
    const nameKey = name.toLowerCase();
    const commentKey = comment.toLowerCase();

    if (blackNames.includes(nameKey)) return false;
    if (blackKeywords.some((kw) => combined.includes(kw))) return false;
    if (excluded.some((kw) => combined.includes(kw))) return false;
    if (required.length && !required.some((kw) => combined.includes(kw))) return false;

    let key = nameKey;
    if (dedupeMode === 'comment') key = commentKey;
    if (dedupeMode === 'name-comment') key = `${nameKey}__${commentKey}`;
    if (dedupeMode !== 'none') {
      if (seen.has(key)) return false;
      seen.add(key);
    }
    return true;
  });
}
