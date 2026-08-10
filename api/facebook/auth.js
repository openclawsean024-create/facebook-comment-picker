import { rateLimitResponse } from '../_lib/rate-limit.js';

/**
 * GET /api/facebook/auth
 * 發起 Facebook OAuth 2.0 授權流程
 */
export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  // Rate limit: 30 req/60s per IP
  const rl = rateLimitResponse(req, res, { maxRequests: 30, windowMs: 60000, bucket: 'auth' });
  if (rl) return rl;


  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;

  if (!appId) {
    return res.status(500).json({ error: 'FACEBOOK_APP_ID is not configured' });
  }

  const host = req.headers.host || 'localhost';
  const protocol = host.includes('vercel') ? 'https' : 'http';
  const redirectUri = process.env.FACEBOOK_REDIRECT_URI
    || `${protocol}://${host}/api/facebook/callback`;

  const state = Math.random().toString(36).substring(2, 18);

  // Store state in cookie (30 min expiry)
  res.setHeader('Set-Cookie', `fb_oauth_state=${state}; HttpOnly; SameSite=Lax; Max-Age=1800; Path=/`);

  // ✅ scope 需包含 pages_show_list 才能列出我管理的粉專 + pages_read_engagement 拉貼文+留言
  //   - 個人開發者 + 自己管理的粉專 不需要 App Review（user-level token 拿得到）
  const scopes = [
    'pages_show_list',
    'pages_read_engagement',
    'public_profile',
    'email',
  ].join(',');

  const authUrl = new URL('https://www.facebook.com/v19.0/dialog/oauth');
  authUrl.searchParams.set('client_id', appId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('response_type', 'code');

  return res.redirect(302, authUrl.toString());
}
