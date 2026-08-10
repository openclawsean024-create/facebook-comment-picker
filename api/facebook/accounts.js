import { rateLimitResponse } from '../_lib/rate-limit.js';

/**
 * GET /api/facebook/accounts
 * 列出當前 FB user 管理的粉絲專頁（pages）
 *
 * Query params:
 *   - token (required): user-level access token from OAuth callback
 *
 * Response:
 *   { ok, accounts: [{ id, name, access_token, category, picture, tasks }] }
 *
 * 備註：拿 page-level access_token，這樣才能拉粉專貼文留言（user-level 沒權限）
 *      範圍需包含 pages_show_list（讓使用者看到自己管理的粉專）
 */
export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  // Rate limit: 30 req/60s per IP
  const rl = rateLimitResponse(req, res, { maxRequests: 30, windowMs: 60000, bucket: 'accounts' });
  if (rl) return rl;


  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const accessToken = req.query.token || req.headers['x-fb-token'];
  if (!accessToken) {
    return res.status(400).json({ error: 'Missing access token (pass ?token=...)' });
  }

  const fields = [
    'id',
    'name',
    'category',
    'access_token',
    'picture{url}',
    'tasks',
  ].join(',');

  const params = new URLSearchParams({
    access_token: accessToken,
    fields,
    limit: '100',
  });

  try {
    const resp = await fetch(`https://graph.facebook.com/v19.0/me/accounts?${params}`);
    const data = await resp.json();

    if (data.error) {
      return res.status(400).json({
        ok: false,
        error: data.error.message,
        error_code: data.error.code,
        error_type: data.error.type,
        hint: '需重新授權，scope 應包含 pages_show_list + pages_read_engagement',
      });
    }

    const accounts = (data.data || []).map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category || 'Unknown',
      picture: p.picture?.data?.url || null,
      accessToken: p.access_token, // ★ page-level token,後續拉貼文+留言用
      tasks: p.tasks || [],
      canRead: (p.tasks || []).includes('MODERATE') || (p.tasks || []).includes('ANALYZE'),
    }));

    return res.status(200).json({
      ok: true,
      total: accounts.length,
      accounts,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
