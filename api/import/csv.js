/**
 * POST /api/import/csv
 * 手動 CSV 匯入：解析 CSV 或純文字格式的留言名單
 *
 * Request body (JSON):
 * {
 *   "raw": "王小明 | 我要抽大獎\n陳小華 | Logitech 福袋買起來",
 *   "format": "pipe" | "csv" | "auto"
 * }
 *
 * Response:
 * {
 *   "ok": true,
 *   "count": 8,
 *   "entries": [{ "name": "...", "comment": "...", "age": "" }, ...]
 * }
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = req.body || {};
  const { raw = '', format = 'auto' } = body;

  if (!raw.trim()) {
    return res.status(400).json({ error: 'Missing raw data' });
  }

  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  const entries = [];

  // Detect format
  const detectedFormat = format !== 'auto'
    ? format
    : (lines[0] && lines[0].includes(',') ? 'csv' : 'pipe');

  if (detectedFormat === 'csv') {
    // CSV: name,comment[,age]
    for (const line of lines) {
      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));
      if (!parts[0]) continue;
      entries.push({
        name: parts[0],
        comment: parts.slice(1).join(', '),
        age: parts[2] || '',
      });
    }
  } else {
    // Pipe-delimited: name | comment
    for (const line of lines) {
      const parts = line.split('|').map(p => p.trim()).filter(Boolean);
      if (!parts[0]) continue;
      entries.push({
        name: parts[0],
        comment: parts.slice(1).join(' | '),
        age: '',
      });
    }
  }

  return res.status(200).json({
    ok: true,
    count: entries.length,
    format: detectedFormat,
    entries,
  });
}
