/**
 * GET /api/facebook/auth
 * 發起 Facebook OAuth 2.0 授權流程
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
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

  const scopes = ['pages_read_engagement', 'public_profile', 'email'].join(',');

  const authUrl = new URL('https://www.facebook.com/v18.0/dialog/oauth');
  authUrl.searchParams.set('client_id', appId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('scope', scopes);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('response_type', 'code');

  return res.redirect(302, authUrl.toString());
}
