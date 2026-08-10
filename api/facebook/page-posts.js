import { rateLimitResponse } from '../_lib/rate-limit.js';

/**
 * GET /api/facebook/page-posts
 * 列出指定粉專的近期貼文（最多 100 篇）
 *
 * Query params:
 *   - pageId (required): 粉專 ID
 *   - token (required): page-level access token (from /api/facebook/accounts)
 *   - limit (optional, default 25, max 100)
 *
 * Response:
 *   { ok, posts: [{ id, message, created_time, permalink_url, full_picture, reactions, comments }] }
 */
export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  // Rate limit: 60 req/60s per IP
  const rl = rateLimitResponse(req, res, { maxRequests: 60, windowMs: 60000, bucket: 'page-posts' });
  if (rl) return rl;


  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { pageId, token } = req.query;
  const limit = Math.min(parseInt(req.query.limit || '25', 10), 100);

  if (!pageId || !token) {
    return res.status(400).json({ error: 'Missing pageId or token' });
  }

  const fields = [
    'id',
    'message',
    'story',
    'created_time',
    'permalink_url',
    'full_picture',
    'reactions.summary(true).limit(0)',
    'comments.summary(true).limit(0)',
    'shares',
  ].join(',');

  const params = new URLSearchParams({
    access_token: token,
    fields,
    limit: String(limit),
  });

  try {
    const resp = await fetch(`https://graph.facebook.com/v19.0/${pageId}/posts?${params}`);
    const data = await resp.json();

    if (data.error) {
      return res.status(400).json({
        ok: false,
        error: data.error.message,
        error_code: data.error.code,
        error_type: data.error.type,
      });
    }

    const posts = (data.data || []).map((p) => ({
      id: p.id,
      message: p.message || p.story || '(無內文)',
      createdTime: p.created_time,
      permalinkUrl: p.permalink_url,
      picture: p.full_picture || null,
      commentCount: p.comments?.summary?.total_count || 0,
      reactionCount: p.reactions?.summary?.total_count || 0,
      shareCount: p.shares?.count || 0,
    }));

    return res.status(200).json({
      ok: true,
      pageId,
      total: posts.length,
      posts,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}
