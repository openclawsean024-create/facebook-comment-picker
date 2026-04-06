/**
 * POST /api/draw
 * 執行抽獎演算法，回傳中獎名單
 *
 * Request body:
 * {
 *   "participants": [{ "name": "王小明", "comment": "我要抽大獎", "id": "..." }],
 *   "prizes": [{ "name": "頭獎", "count": 1 }, { "name": "參加獎", "count": 3 }],
 *   "seed": "optional-seed-string",
 *   "filters": {
 *     "excludeKeywords": ["測試", "取消"],
 *     "requiredKeywords": ["抽"],
 *     "blacklistNames": ["周大成"],
 *     "dedupeMode": "name"  // "name" | "comment" | "name-comment" | "none"
 *   }
 * }
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body || {};
  const {
    participants = [],
    prizes = [],
    seed = '',
    filters = {},
  } = body;

  if (!Array.isArray(participants) || participants.length === 0) {
    return res.status(400).json({ error: 'No participants provided' });
  }

  // ── Apply filters ─────────────────────────────────────────────────────────
  const {
    excludeKeywords = [],
    requiredKeywords = [],
    blacklistNames = [],
    dedupeMode = 'name',
  } = filters;

  const parseList = (arr) => (Array.isArray(arr) ? arr : []).map(v => String(v).toLowerCase().trim()).filter(Boolean);
  const required = parseList(requiredKeywords);
  const excluded = parseList(excludeKeywords);
  const blackNames = parseList(blacklistNames);

  const seen = new Set();
  const filtered = participants.filter((item) => {
    const name = String(item.name || '').trim();
    const comment = String(item.comment || '').trim();
    const combined = `${name} ${comment}`.toLowerCase();
    const nameKey = name.toLowerCase();
    const commentKey = comment.toLowerCase();

    // Blacklist name
    if (blackNames.includes(nameKey)) return false;

    // Exclude keywords
    if (excluded.some(kw => combined.includes(kw))) return false;

    // Required keywords
    if (required.length && !required.some(kw => combined.includes(kw))) return false;

    // Dedupe
    let dedupeKey = nameKey;
    if (dedupeMode === 'comment') dedupeKey = commentKey;
    if (dedupeMode === 'name-comment') dedupeKey = `${nameKey}__${commentKey}`;
    if (dedupeMode !== 'none') {
      if (seen.has(dedupeKey)) return false;
      seen.add(dedupeKey);
    }

    return true;
  });

  // ── Expand prize slots ────────────────────────────────────────────────────
  const prizeSlots = prizes.flatMap(prize => {
    const count = Math.max(1, Number(prize.count || 1));
    const name = String(prize.name || '未命名獎項').trim();
    return Array.from({ length: count }, () => name);
  });

  if (prizeSlots.length === 0) {
    return res.status(400).json({ error: 'No prize slots defined' });
  }

  // ── Drawing algorithm (Fisher-Yates + seeded PRNG) ───────────────────────
  const drawSeed = seed || String(Date.now());
  const winners = runDraw(filtered, prizeSlots, drawSeed);

  return res.status(200).json({
    ok: true,
    drawSeed,
    totalParticipants: participants.length,
    filteredParticipants: filtered.length,
    prizeSlots: prizeSlots.length,
    winners,
    drawnAt: new Date().toISOString(),
  });
}

// ── Seeded PRNG (mulberry32) ─────────────────────────────────────────────────

function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h >>> 0) || 123456789;
}

function mulberry32(seed) {
  let s = seed;
  return () => {
    s = Math.imul(s ^ (s >>> 15), s | 1);
    s ^= s + Math.imul(s ^ (s >>> 7), s | 61);
    return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Fisher-Yates shuffle with seeded RNG ────────────────────────────────────

function runDraw(participants, prizeSlots, seedText) {
  const pool = [...participants];
  const seedNum = hashString(seedText);
  const rand = mulberry32(seedNum);

  // Fisher-Yates shuffle
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  return pool.slice(0, prizeSlots.length).map((winner, idx) => ({
    ...winner,
    prize: prizeSlots[idx] || `獎項 ${idx + 1}`,
  }));
}
